"""
Chief of Staff — automated PR reviewer for CreditMind.

Triggered by GitHub Actions on every PR. Checks:
  1. Ownership violations — did the author touch files outside their zone?
  2. Shared file edits — flags any changes to shared modules requiring Peter's review
  3. Logical conflicts — Claude analyzes the diff for overlaps with other members' work
  4. Integration risks — changes to shared interfaces (APIs, schemas, function signatures)

Posts a verdict comment on the PR. Exits non-zero to block merge if issues found.
"""

import os
import json
import sys
import subprocess
import requests
from anthropic import Anthropic

OWNERSHIP_MAP_PATH = os.path.join(os.path.dirname(__file__), "ownership_map.json")


def load_ownership_map() -> dict:
    with open(OWNERSHIP_MAP_PATH) as f:
        return json.load(f)


def resolve_author(github_username: str, ownership_map: dict) -> str | None:
    for name, config in ownership_map["team"].items():
        if config["github_username"].lower() == github_username.lower():
            return name
    return None


def check_ownership_violations(changed_files: list, author_name: str, ownership_map: dict) -> tuple[list, list]:
    violations = []
    shared_edits = []

    author_config = ownership_map["team"].get(author_name, {})
    owned_files = set(author_config.get("files", []))
    owned_patterns = author_config.get("patterns", [])
    shared_files = set(ownership_map["shared"]["files"])

    for file in changed_files:
        # Check if author owns this file
        owned = file in owned_files or any(file.startswith(p) for p in owned_patterns)

        if not owned:
            # Check if it's a shared file
            if file in shared_files:
                shared_edits.append(file)
                continue

            # Find actual owner
            actual_owner = "unassigned"
            for member, config in ownership_map["team"].items():
                if member == author_name:
                    continue
                if file in config.get("files", []) or any(file.startswith(p) for p in config.get("patterns", [])):
                    actual_owner = member
                    break

            violations.append({"file": file, "actual_owner": actual_owner})

    return violations, shared_edits


def analyze_with_claude(
    changed_files: list,
    diff_content: str,
    author_name: str,
    pr_title: str,
    ownership_map: dict,
) -> dict:
    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    team_summary = {
        name: {"role": config["role"], "files": config["files"], "patterns": config["patterns"]}
        for name, config in ownership_map["team"].items()
        if name != author_name
    }

    prompt = f"""You are the Chief of Staff for CreditMind, an AI-powered credit underwriting platform built with Python/FastAPI/Streamlit.

A team member has submitted a Pull Request. Review it for logical conflicts and integration risks.

PR Author: {author_name} ({ownership_map["team"].get(author_name, {}).get("role", "unknown role")})
PR Title: {pr_title}
Files Changed: {json.dumps(changed_files)}

Other team members and their ownership zones:
{json.dumps(team_summary, indent=2)}

Code Diff (truncated to 8000 chars):
{diff_content[:8000]}

Analyze for:
1. LOGICAL CONFLICTS: Does this change duplicate or contradict functionality owned by another team member?
2. INTEGRATION RISKS: Does this change alter shared interfaces (function signatures, API endpoints, data schemas, tool definitions) that others depend on?
3. MISSING INTEGRATIONS: Does this change introduce new functionality that should connect to another module but doesn't appear to?

Be specific and concise. Reference actual file names and function names where possible.

Respond with valid JSON only:
{{
  "logical_conflicts": ["specific conflict description", ...],
  "integration_risks": ["specific risk description", ...],
  "missing_integrations": ["specific missing connection", ...],
  "summary": "one sentence overall assessment"
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text
    try:
        clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(clean)
    except json.JSONDecodeError:
        return {
            "logical_conflicts": [],
            "integration_risks": [],
            "missing_integrations": [],
            "summary": raw,
        }


def post_github_comment(repo: str, pr_number: int, body: str, token: str):
    url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    resp = requests.post(url, headers=headers, json={"body": body})
    if resp.status_code not in (200, 201):
        print(f"Warning: failed to post GitHub comment — {resp.status_code}: {resp.text}")


def build_comment(
    pr_title: str,
    author_name: str,
    changed_files: list,
    violations: list,
    shared_edits: list,
    analysis: dict,
    blocked: bool,
) -> str:
    status = "🔴 BLOCKED" if blocked else "✅ CLEARED"
    lines = [
        f"## Chief of Staff Review — {status}",
        f"**PR:** {pr_title}",
        f"**Author:** {author_name}",
        f"**Files reviewed:** {len(changed_files)}",
        "",
    ]

    if violations:
        lines += ["### Ownership Violations", "These files are outside your assigned zone — coordinate with the owner before changing them:", ""]
        for v in violations:
            lines.append(f"- `{v['file']}` — owned by **{v['actual_owner']}**")
        lines.append("")

    if shared_edits:
        lines += ["### Shared Module Edits", "These files are in the shared zone and require **Peter's explicit approval**:", ""]
        for f in shared_edits:
            lines.append(f"- `{f}`")
        lines.append("")

    if analysis.get("logical_conflicts"):
        lines += ["### Logical Conflicts", ""]
        for c in analysis["logical_conflicts"]:
            lines.append(f"- {c}")
        lines.append("")

    if analysis.get("integration_risks"):
        lines += ["### Integration Risks", ""]
        for r in analysis["integration_risks"]:
            lines.append(f"- {r}")
        lines.append("")

    if analysis.get("missing_integrations"):
        lines += ["### Missing Integrations", ""]
        for m in analysis["missing_integrations"]:
            lines.append(f"- {m}")
        lines.append("")

    lines += ["### Assessment", analysis.get("summary", "No issues found."), ""]

    if blocked:
        lines.append("---")
        lines.append("*Resolve the issues above, then push again to re-trigger this review. Peter approves only after Chief of Staff clears.*")
    else:
        lines.append("---")
        lines.append("*No conflicts detected. Peter — this PR is ready for your final approval.*")

    return "\n".join(lines)


def main():
    pr_author_username = os.getenv("PR_AUTHOR", "")
    pr_title = os.getenv("PR_TITLE", "Untitled PR")
    pr_number = int(os.getenv("PR_NUMBER", "0"))
    repo = os.getenv("GITHUB_REPOSITORY", "")
    github_token = os.getenv("GITHUB_TOKEN", "")
    changed_files_path = os.getenv("CHANGED_FILES_PATH", "")
    if changed_files_path and os.path.exists(changed_files_path):
        with open(changed_files_path) as f:
            changed_files = [l.strip() for l in f if l.strip()]
    else:
        changed_files_raw = os.getenv("CHANGED_FILES", "")
        changed_files = [f.strip() for f in changed_files_raw.splitlines() if f.strip()]

    try:
        result = subprocess.run(
            ["git", "diff", "origin/master...HEAD"],
            capture_output=True, text=True, errors="replace"
        )
        diff_content = result.stdout[:10000]
    except Exception:
        diff_content = ""

    ownership_map = load_ownership_map()

    # Resolve GitHub username to team member name
    author_name = resolve_author(pr_author_username, ownership_map)
    if not author_name:
        comment = (
            f"## Chief of Staff Review — ⚠️ UNKNOWN AUTHOR\n\n"
            f"GitHub user `{pr_author_username}` is not registered in the ownership map.\n\n"
            f"Peter — please add this user to `team/ownership_map.json` before merging."
        )
        if github_token and pr_number:
            post_github_comment(repo, pr_number, comment, github_token)
        print(comment)
        sys.exit(1)

    # Run checks
    violations, shared_edits = check_ownership_violations(changed_files, author_name, ownership_map)
    analysis = analyze_with_claude(changed_files, diff_content, author_name, pr_title, ownership_map)

    blocked = bool(violations or analysis.get("logical_conflicts"))

    comment = build_comment(pr_title, author_name, changed_files, violations, shared_edits, analysis, blocked)

    if github_token and pr_number:
        post_github_comment(repo, pr_number, comment, github_token)

    print(comment)
    sys.exit(1 if blocked else 0)


if __name__ == "__main__":
    main()
