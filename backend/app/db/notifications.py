from datetime import datetime

import asyncpg

from app.db.pool import connection
from app.models import Notification, NotificationKind, Role
from app.timeutil import utc_now


def _row_to_notification(row: asyncpg.Record) -> Notification:
    return Notification(**dict(row))


async def insert_notification(
    role: Role,
    unit_id: str,
    kind: NotificationKind,
    message: str,
    incident_id: str | None = None,
    created_at: datetime | None = None,
    conn: asyncpg.Connection | None = None,
) -> Notification:
    """Insert only. Use services.notifications.create_notification() to also broadcast."""
    async with connection(conn) as c:
        row = await c.fetchrow(
            """insert into notifications (role, unit_id, kind, message, incident_id, created_at)
               values ($1, $2, $3, $4, $5, $6)
               returning *""",
            role,
            unit_id,
            kind,
            message,
            incident_id,
            created_at or utc_now(),
        )
    return _row_to_notification(row)


async def list_notifications(
    role: Role | None = None, conn: asyncpg.Connection | None = None
) -> list[Notification]:
    """Newest first. Without a role, both roles' notifications."""
    async with connection(conn) as c:
        rows = await c.fetch(
            """select * from notifications
                where ($1::text is null or role = $1)
                order by created_at desc""",
            role,
        )
    return [_row_to_notification(r) for r in rows]


async def mark_all_read(role: Role, conn: asyncpg.Connection | None = None) -> None:
    async with connection(conn) as c:
        await c.execute("update notifications set read = true where role = $1 and not read", role)
