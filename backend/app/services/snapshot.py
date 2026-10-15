from app.db import incidents, notifications, units
from app.db.pool import get_pool
from app.models import Config, Snapshot
from app.settings import settings


def current_config() -> Config:
    """GET /api/config and the snapshot's config, from .env."""
    return Config(
        grace_period_seconds=settings.grace_period_seconds,
        reminder_interval_seconds=settings.reminder_interval_seconds,
    )


async def build_snapshot() -> Snapshot:
    """Full state for the `snapshot` WebSocket event. Backend 1's /ws handler sends this on connect.

    Read in one repeatable-read transaction, so units, incidents and notifications are
    consistent with each other even if a reading arrives mid-build.
    """
    async with get_pool().acquire() as conn, conn.transaction(isolation="repeatable_read", readonly=True):
        return Snapshot(
            units=await units.list_units(conn=conn),
            incidents=await incidents.list_incidents(conn=conn),  # all since reset; small dataset
            notifications=await notifications.list_notifications(conn=conn),  # both roles, newest first
            config=current_config(),
        )
