from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.settings import settings


def utc_now() -> datetime:
    """Current time, timezone-aware UTC."""
    return datetime.now(timezone.utc)


def iso(dt: datetime | None) -> str | None:
    """UTC ISO-8601 with millisecond precision and a Z suffix, e.g. 2026-10-15T01:02:03.123Z."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        raise ValueError("naive datetime; all timestamps must be timezone-aware")
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def local_hhmm(dt: datetime) -> str:
    """Clock time like "08:02" in DEMO_TIMEZONE, for reason lines."""
    return dt.astimezone(ZoneInfo(settings.demo_timezone)).strftime("%H:%M")
