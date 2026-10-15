import asyncpg

from app.db import notifications as db_notifications
from app.models import Notification, NotificationKind, Role
from app.realtime import broadcast as realtime
from app.timeutil import utc_now


async def create_notification(
    role: Role,
    unit_id: str,
    kind: NotificationKind,
    message: str,
    incident_id: str | None = None,
    conn: asyncpg.Connection | None = None,
) -> Notification:
    """The one path for every notification (both backends): insert, then broadcast.

    If called inside a transaction, the broadcast fires before commit. That is acceptable for
    the prototype; if it becomes an issue, insert via app.db.notifications and broadcast after
    commit instead.
    """
    notification = await db_notifications.insert_notification(
        role, unit_id, kind, message, incident_id=incident_id, created_at=utc_now(), conn=conn
    )
    await realtime.broadcast("notification.created", notification)
    return notification
