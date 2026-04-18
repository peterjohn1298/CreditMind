"""
CreditMind — PostgreSQL persistence layer.
Owner: Peter / backend team

Uses SQLAlchemy Core with JSONB columns so the full credit_state dict is stored
without a rigid schema — agents can add fields freely and they'll persist.

Set DATABASE_URL in Railway env vars (Railway auto-injects this for Postgres services).
Falls back gracefully to in-memory-only mode if DATABASE_URL is not set.
"""

import json
import os
from datetime import datetime

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------

_DATABASE_URL = os.environ.get("DATABASE_URL", "")

# SQLAlchemy 2.x requires postgresql:// not postgres://
if _DATABASE_URL.startswith("postgres://"):
    _DATABASE_URL = _DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Railway public Postgres URLs require SSL
if _DATABASE_URL and "sslmode" not in _DATABASE_URL:
    _DATABASE_URL += "?sslmode=require"

_engine: Engine | None = None


def _get_engine() -> Engine | None:
    global _engine
    if not _DATABASE_URL:
        return None
    if _engine is None:
        _engine = create_engine(_DATABASE_URL, pool_pre_ping=True, pool_size=3, max_overflow=5)
    return _engine


def is_available() -> bool:
    return bool(_DATABASE_URL)


# ---------------------------------------------------------------------------
# Schema bootstrap
# ---------------------------------------------------------------------------

def init_db() -> None:
    """Create tables if they don't exist. Safe to call on every startup."""
    engine = _get_engine()
    if not engine:
        return
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS deals (
                deal_id    TEXT PRIMARY KEY,
                data       JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sector_alerts (
                alert_id   TEXT PRIMARY KEY,
                data       JSONB NOT NULL,
                resolved   BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sector_scores (
                sector_id  TEXT PRIMARY KEY,
                score      INTEGER NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS refresh_log (
                id         SERIAL PRIMARY KEY,
                ran_at     TIMESTAMPTZ DEFAULT NOW(),
                last_error TEXT
            )
        """))
        conn.commit()


# ---------------------------------------------------------------------------
# Deals
# ---------------------------------------------------------------------------

def load_portfolio() -> dict[str, dict]:
    """Return all deals keyed by deal_id. Empty dict if DB unavailable."""
    engine = _get_engine()
    if not engine:
        return {}
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT deal_id, data FROM deals")).fetchall()
            return {row[0]: row[1] for row in rows}
    except Exception:
        return {}


def save_deal(deal_id: str, data: dict) -> None:
    engine = _get_engine()
    if not engine:
        return
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO deals (deal_id, data, updated_at)
                VALUES (:deal_id, :data::jsonb, NOW())
                ON CONFLICT (deal_id) DO UPDATE
                    SET data = EXCLUDED.data, updated_at = NOW()
            """), {"deal_id": deal_id, "data": json.dumps(data, default=str)})
            conn.commit()
    except Exception:
        pass  # DB write failure must never crash the API


def save_portfolio(portfolio: dict[str, dict]) -> None:
    for deal_id, data in portfolio.items():
        save_deal(deal_id, data)


# ---------------------------------------------------------------------------
# Sector alerts
# ---------------------------------------------------------------------------

def load_sector_alerts() -> list[dict]:
    engine = _get_engine()
    if not engine:
        return []
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text("SELECT data FROM sector_alerts ORDER BY created_at DESC")
            ).fetchall()
            return [row[0] for row in rows]
    except Exception:
        return []


def save_sector_alerts(alerts: list[dict]) -> None:
    engine = _get_engine()
    if not engine:
        return
    try:
        with engine.connect() as conn:
            conn.execute(text("DELETE FROM sector_alerts"))
            for alert in alerts:
                alert_id = alert.get("alert_id") or f"sector-{datetime.now().timestamp()}"
                conn.execute(text("""
                    INSERT INTO sector_alerts (alert_id, data, resolved)
                    VALUES (:alert_id, :data::jsonb, :resolved)
                    ON CONFLICT (alert_id) DO UPDATE
                        SET data = EXCLUDED.data, resolved = EXCLUDED.resolved
                """), {
                    "alert_id": alert_id,
                    "data": json.dumps(alert, default=str),
                    "resolved": alert.get("resolved", False),
                })
            conn.commit()
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Sector scores
# ---------------------------------------------------------------------------

def load_sector_scores() -> dict[str, int]:
    engine = _get_engine()
    if not engine:
        return {}
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT sector_id, score FROM sector_scores")).fetchall()
            return {row[0]: row[1] for row in rows}
    except Exception:
        return {}


def save_sector_scores(scores: dict[str, int]) -> None:
    engine = _get_engine()
    if not engine:
        return
    try:
        with engine.connect() as conn:
            for sector_id, score in scores.items():
                conn.execute(text("""
                    INSERT INTO sector_scores (sector_id, score, updated_at)
                    VALUES (:sector_id, :score, NOW())
                    ON CONFLICT (sector_id) DO UPDATE
                        SET score = EXCLUDED.score, updated_at = NOW()
                """), {"sector_id": sector_id, "score": int(score)})
            conn.commit()
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Refresh log
# ---------------------------------------------------------------------------

def log_refresh(error: str | None = None) -> None:
    engine = _get_engine()
    if not engine:
        return
    try:
        with engine.connect() as conn:
            conn.execute(
                text("INSERT INTO refresh_log (ran_at, last_error) VALUES (NOW(), :error)"),
                {"error": error},
            )
            conn.commit()
    except Exception:
        pass


def get_last_refresh() -> tuple[str | None, str | None]:
    """Returns (last_run_iso, last_error)."""
    engine = _get_engine()
    if not engine:
        return None, None
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT ran_at, last_error FROM refresh_log ORDER BY ran_at DESC LIMIT 1")
            ).fetchone()
            if row:
                return row[0].isoformat() if row[0] else None, row[1]
    except Exception:
        pass
    return None, None
