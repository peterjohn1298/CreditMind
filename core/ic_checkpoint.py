"""
IC Checkpoint — human-in-the-loop decision layer.

After DD completes (status = IC_REVIEW) the orchestrator calls create_checkpoint().
Real IC members then vote via the API. Quorum gates the final decision.
The AI ICCommitteeAgent output is advisory input — humans make the final call.

Lifecycle:
  PENDING        — checkpoint created, awaiting votes
  QUORUM_REACHED — enough votes received, ready to finalize
  FINALIZED      — final_decision set by deal lead / chair
  PUSHED_BACK    — IC pushed back; deal goes back to analyst for response
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

# Quorum: all three IC members must vote
_QUORUM = 3
# Votes needed to constitute a decision direction (simple majority)
_MAJORITY = 2

VALID_VOTES = {"APPROVE", "CONDITIONAL_APPROVE", "REJECT"}
VALID_DECISIONS = {"APPROVE", "CONDITIONAL_APPROVE", "REJECT"}


@dataclass
class _ICVote:
    member: str
    vote: str
    conditions: list = field(default_factory=list)
    notes: str = ""
    timestamp: str = ""


@dataclass
class _ICCheckpoint:
    deal_id: str
    company: str
    status: str                       # PENDING | QUORUM_REACHED | FINALIZED | PUSHED_BACK
    ai_recommendation: str            # from AI ICCommitteeAgent or ICMemoWriter
    ai_conditions: list = field(default_factory=list)
    ai_rationale: str = ""
    votes: list = field(default_factory=list)       # list of _ICVote
    final_decision: Optional[str] = None
    final_conditions: list = field(default_factory=list)
    push_back_notes: list = field(default_factory=list)
    created_at: str = ""
    finalized_at: str = ""


# In-memory store keyed by deal_id.
# API layer (John) can persist/restore these via save_deal() if needed.
_checkpoints: dict[str, _ICCheckpoint] = {}


# ── Public API ────────────────────────────────────────────────────────────────

def create_checkpoint(deal_id: str, credit_state: dict) -> dict:
    """
    Create an IC checkpoint from a completed DD credit_state.
    Called by the orchestrator immediately before returning IC_REVIEW status.
    Uses ICCommitteeAgent output if available, else ICMemoWriter recommendation.
    """
    ic_output = credit_state.get("ic_committee_output") or {}
    ic_memo   = credit_state.get("ic_memo") or {}

    ai_recommendation = (
        ic_output.get("ic_decision")
        or ic_memo.get("recommendation")
        or "CONDITIONAL_APPROVE"
    )
    ai_conditions = ic_output.get("approval_conditions") or ic_memo.get("conditions") or []
    ai_rationale  = ic_output.get("ic_rationale") or ic_memo.get("executive_summary") or ""

    cp = _ICCheckpoint(
        deal_id=deal_id,
        company=credit_state.get("company", "Unknown"),
        status="PENDING",
        ai_recommendation=ai_recommendation,
        ai_conditions=ai_conditions,
        ai_rationale=ai_rationale,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    _checkpoints[deal_id] = cp
    return _to_dict(cp)


def get_checkpoint(deal_id: str) -> dict:
    """Return the current IC checkpoint state for a deal."""
    cp = _checkpoints.get(deal_id)
    if not cp:
        return {"error": f"No IC checkpoint for deal_id={deal_id}"}
    return _to_dict(cp)


def list_pending() -> list[dict]:
    """Return all checkpoints not yet finalized."""
    return [
        _to_dict(cp)
        for cp in _checkpoints.values()
        if cp.status != "FINALIZED"
    ]


def submit_vote(
    deal_id: str,
    member: str,
    vote: str,
    conditions: list = None,
    notes: str = "",
) -> dict:
    """
    Record or replace an IC member vote.

    vote: APPROVE | CONDITIONAL_APPROVE | REJECT
    conditions: list of condition strings (required if vote == CONDITIONAL_APPROVE)
    """
    if vote not in VALID_VOTES:
        raise ValueError(f"vote must be one of {VALID_VOTES}, got '{vote}'")

    cp = _require(deal_id)
    if cp.status == "FINALIZED":
        raise ValueError("Cannot vote on a finalized checkpoint.")

    # Idempotent — replace if member already voted
    cp.votes = [v for v in cp.votes if v.member != member]
    cp.votes.append(_ICVote(
        member=member,
        vote=vote,
        conditions=conditions or [],
        notes=notes,
        timestamp=datetime.now(timezone.utc).isoformat(),
    ))

    if len(cp.votes) >= _QUORUM:
        cp.status = "QUORUM_REACHED"

    return _to_dict(cp)


def push_back(deal_id: str, member: str, question: str) -> dict:
    """
    IC member raises a question or pushes back before voting.
    Sets status = PUSHED_BACK so analysts know a response is needed.
    """
    cp = _require(deal_id)
    cp.push_back_notes.append({
        "member":    member,
        "question":  question,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    if cp.status == "PENDING":
        cp.status = "PUSHED_BACK"
    return _to_dict(cp)


def clear_push_back(deal_id: str, analyst_response: str) -> dict:
    """Analyst responds to IC push-back; status reverts to PENDING so voting can resume."""
    cp = _require(deal_id)
    cp.push_back_notes.append({
        "member":    "ANALYST_RESPONSE",
        "question":  analyst_response,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    if cp.status == "PUSHED_BACK":
        cp.status = "PENDING"
    return _to_dict(cp)


def finalize_decision(
    deal_id: str,
    decision: str,
    final_conditions: list = None,
    decided_by: str = "",
) -> dict:
    """
    Finalize the IC decision — called by deal lead / IC chair after quorum reached.
    Locks the checkpoint; downstream Documentation and Closing agents read final_decision.

    decision: APPROVE | CONDITIONAL_APPROVE | REJECT
    """
    if decision not in VALID_DECISIONS:
        raise ValueError(f"decision must be one of {VALID_DECISIONS}")

    cp = _require(deal_id)
    if cp.status not in ("QUORUM_REACHED", "PUSHED_BACK", "PENDING"):
        raise ValueError(f"Cannot finalize checkpoint in status '{cp.status}'")

    cp.final_decision   = decision
    cp.final_conditions = final_conditions or _merge_conditions(cp)
    cp.status           = "FINALIZED"
    cp.finalized_at     = datetime.now(timezone.utc).isoformat()

    if decided_by:
        cp.push_back_notes.append({
            "member":    decided_by,
            "question":  f"Decision finalized: {decision}",
            "timestamp": cp.finalized_at,
        })

    return _to_dict(cp)


def tally(deal_id: str) -> dict:
    """Count votes and surface consensus direction."""
    cp = _checkpoints.get(deal_id)
    if not cp:
        return {}
    counts: dict[str, int] = {}
    for v in cp.votes:
        counts[v.vote] = counts.get(v.vote, 0) + 1
    total     = len(cp.votes)
    consensus = max(counts, key=counts.get) if counts else None
    return {
        "total_votes":       total,
        "quorum_required":   _QUORUM,
        "quorum_reached":    total >= _QUORUM,
        "tally":             counts,
        "consensus":         consensus,
        "majority_achieved": (counts.get(consensus, 0) >= _MAJORITY) if consensus else False,
    }


# ── Internal helpers ──────────────────────────────────────────────────────────

def _require(deal_id: str) -> _ICCheckpoint:
    cp = _checkpoints.get(deal_id)
    if not cp:
        raise KeyError(f"No IC checkpoint for deal_id={deal_id}")
    return cp


def _merge_conditions(cp: _ICCheckpoint) -> list:
    """Collect conditions from all CONDITIONAL_APPROVE votes + AI advisory."""
    seen = set()
    merged = []
    for src in [cp.ai_conditions] + [v.conditions for v in cp.votes if v.vote == "CONDITIONAL_APPROVE"]:
        for cond in src:
            key = str(cond).strip().lower()[:80]
            if key and key not in seen:
                seen.add(key)
                merged.append(cond)
    return merged


def _to_dict(cp: _ICCheckpoint) -> dict:
    return {
        "deal_id":           cp.deal_id,
        "company":           cp.company,
        "status":            cp.status,
        "ai_recommendation": cp.ai_recommendation,
        "ai_conditions":     cp.ai_conditions,
        "ai_rationale":      cp.ai_rationale,
        "votes": [
            {
                "member":     v.member,
                "vote":       v.vote,
                "conditions": v.conditions,
                "notes":      v.notes,
                "timestamp":  v.timestamp,
            }
            for v in cp.votes
        ],
        "vote_tally":       tally(cp.deal_id),
        "final_decision":   cp.final_decision,
        "final_conditions": cp.final_conditions,
        "push_back_notes":  cp.push_back_notes,
        "created_at":       cp.created_at,
        "finalized_at":     cp.finalized_at,
    }
