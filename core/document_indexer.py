"""
Document Indexer — splits uploaded PDFs into overlapping chunks and builds a
per-deal TF-IDF retrieval index. Wave 1 agents call RETRIEVE_DOCUMENT_SECTION
to pull the specific passages they need instead of reading a truncated flat window.

Uses numpy only (available via pandas/yfinance) — no additional dependencies.
"""

import re
from typing import List, Dict

import numpy as np

# Global store: deal_id → {doc_type → index_dict}
_deal_indexes: Dict[str, Dict[str, dict]] = {}

_CHUNK_SIZE = 700       # chars per chunk
_CHUNK_OVERLAP = 120    # overlap so sentences aren't split across boundaries

# Section header patterns to label chunks
_SECTION_PATTERN = re.compile(
    r"ITEM\s+\d+[A-Z]?\."
    r"|PART\s+[IVX]+"
    r"|CONSOLIDATED\s+STATEMENTS?"
    r"|NOTES?\s+TO\s+(CONSOLIDATED\s+)?FINANCIAL"
    r"|MANAGEMENT['’]?S?\s+DISCUSSION"
    r"|RISK\s+FACTORS"
    r"|BUSINESS\s+OVERVIEW"
    r"|EXECUTIVE\s+SUMMARY"
    r"|EBITDA\s+(RECONCILIATION|ANALYSIS|BRIDGE)"
    r"|CAPITAL\s+STRUCTURE"
    r"|DEBT\s+SCHEDULE"
    r"|COVENANTS?"
    r"|LEGAL\s+(PROCEEDINGS|MATTERS)",
    re.IGNORECASE,
)

_PAGE_MARKER = re.compile(r"---\s*Page\s*(\d+)\s*---", re.IGNORECASE)

_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "is", "for", "with",
    "that", "this", "as", "on", "at", "be", "was", "has", "are", "from",
    "by", "it", "its", "not", "have", "had", "been", "will", "may", "such",
    "any", "all", "each", "more", "also", "than", "but", "if", "we", "our",
}


# ── Public API ────────────────────────────────────────────────────────────────

def build_index(deal_id: str, doc_type: str, text: str) -> int:
    """
    Index the full text of an uploaded document for a deal.
    Returns number of chunks indexed (0 if text is empty).
    """
    if not text or not text.strip():
        return 0

    chunks = _chunk_text(text, doc_type)
    if not chunks:
        return 0

    tfidf_matrix, idf, vocab = _build_tfidf(chunks)

    if deal_id not in _deal_indexes:
        _deal_indexes[deal_id] = {}

    _deal_indexes[deal_id][doc_type] = {
        "chunks": chunks,
        "tfidf_matrix": tfidf_matrix,
        "idf": idf,
        "vocab": vocab,
    }
    return len(chunks)


def retrieve(deal_id: str, doc_type: str, query: str, top_k: int = 4) -> List[dict]:
    """
    Retrieve the top-k most relevant chunks for a query from a deal's document index.
    Returns list of {text, page, section, relevance_score}.
    """
    if deal_id not in _deal_indexes:
        return [{"error": f"No index found for deal {deal_id}. Documents may not have been indexed yet."}]

    if doc_type not in _deal_indexes[deal_id]:
        available = list(_deal_indexes[deal_id].keys())
        return [{"error": f"Document type '{doc_type}' not indexed for deal {deal_id}. Available: {available}"}]

    idx = _deal_indexes[deal_id][doc_type]
    chunks = idx["chunks"]
    tfidf_matrix = idx["tfidf_matrix"]
    idf = idx["idf"]
    vocab = idx["vocab"]

    q_vec = _vectorize_query(query, vocab, idf)
    scores = tfidf_matrix @ q_vec

    top_k = min(top_k, len(chunks))
    top_indices = np.argsort(scores)[::-1][:top_k]

    results = []
    for i in top_indices:
        score = float(scores[i])
        if score > 0.01:
            results.append({
                "text": chunks[i]["text"],
                "page": chunks[i]["page"],
                "section": chunks[i]["section"],
                "relevance_score": round(score, 3),
            })

    if not results:
        # Return best match even at low relevance rather than nothing
        i = int(np.argmax(scores))
        results.append({
            "text": chunks[i]["text"],
            "page": chunks[i]["page"],
            "section": chunks[i]["section"],
            "relevance_score": round(float(scores[i]), 3),
            "note": "Low-relevance match — this section may not contain the requested information.",
        })

    return results


def has_index(deal_id: str, doc_type: str) -> bool:
    return deal_id in _deal_indexes and doc_type in _deal_indexes[deal_id]


def indexed_doc_types(deal_id: str) -> List[str]:
    return list(_deal_indexes.get(deal_id, {}).keys())


def clear_index(deal_id: str):
    """Free memory after a deal pipeline completes."""
    _deal_indexes.pop(deal_id, None)


# ── Internal helpers ──────────────────────────────────────────────────────────

def _chunk_text(text: str, doc_type: str) -> List[dict]:
    """Split full document text into overlapping chunks with page/section labels."""
    chunks = []
    current_page = 1
    current_section = doc_type.replace("_", " ").title()

    # Split by page markers (format produced by _extract_text_from_pdf)
    parts = _PAGE_MARKER.split(text)

    i = 0
    while i < len(parts):
        if i % 2 == 0:
            block = parts[i]
            # Detect section header in this block
            m = _SECTION_PATTERN.search(block)
            if m:
                current_section = m.group(0).strip().title()
            for chunk in _sliding_window(block, current_page, current_section):
                chunks.append(chunk)
        else:
            try:
                current_page = int(parts[i])
            except ValueError:
                pass
        i += 1

    return chunks


def _sliding_window(text: str, page: int, section: str) -> List[dict]:
    text = text.strip()
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + _CHUNK_SIZE
        chunk_text = text[start:end].strip()
        if len(chunk_text) > 60:
            chunks.append({"text": chunk_text, "page": page, "section": section})
        start += _CHUNK_SIZE - _CHUNK_OVERLAP
    return chunks


def _tokenize(text: str) -> List[str]:
    text = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    return [t for t in text.split() if len(t) > 2 and t not in _STOPWORDS]


def _build_tfidf(chunks: List[dict]):
    """Build L2-normalized TF-IDF matrix. Returns (matrix, idf, vocab)."""
    tokenized = [_tokenize(c["text"]) for c in chunks]

    vocab: Dict[str, int] = {}
    for tokens in tokenized:
        for t in set(tokens):
            if t not in vocab:
                vocab[t] = len(vocab)

    if not vocab:
        return np.zeros((len(chunks), 1), dtype=np.float32), np.ones(1, dtype=np.float32), vocab

    n, v = len(chunks), len(vocab)
    tf = np.zeros((n, v), dtype=np.float32)

    for i, tokens in enumerate(tokenized):
        if not tokens:
            continue
        for t in tokens:
            if t in vocab:
                tf[i, vocab[t]] += 1
        tf[i] /= len(tokens)

    df = np.sum(tf > 0, axis=0).astype(np.float32)
    idf = np.log((n + 1) / (df + 1)).astype(np.float32) + 1.0
    tfidf = tf * idf

    norms = np.linalg.norm(tfidf, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return (tfidf / norms), idf, vocab


def _vectorize_query(query: str, vocab: Dict[str, int], idf: np.ndarray) -> np.ndarray:
    tokens = _tokenize(query)
    q_vec = np.zeros(len(vocab), dtype=np.float32)
    for t in tokens:
        if t in vocab:
            q_vec[vocab[t]] += 1
    if tokens:
        q_vec /= len(tokens)
    q_vec *= idf
    norm = np.linalg.norm(q_vec)
    if norm > 0:
        q_vec /= norm
    return q_vec
