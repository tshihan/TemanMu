from datetime import datetime

import asyncpg

from app.db.pool import connection
from app.models import AccessEvent


def _row_to_event(row: asyncpg.Record) -> AccessEvent:
    return AccessEvent(
        unit_id=row["unit_id"],
        card_holder=row["card_holder"],
        direction=row["direction"],
        access_point=row["access_point"],
        at=row["at"],
    )


async def insert_access_event(event: AccessEvent, conn: asyncpg.Connection | None = None) -> AccessEvent:
    async with connection(conn) as c:
        row = await c.fetchrow(
            """insert into access_events (unit_id, card_holder, direction, access_point, at)
               values ($1, $2, $3, $4, $5)
               returning *""",
            event.unit_id, event.card_holder, event.direction, event.access_point, event.at,
        )
    return _row_to_event(row)


async def list_access_events(
    unit_id: str, since: datetime | None = None, conn: asyncpg.Connection | None = None
) -> list[AccessEvent]:
    """Card taps for a unit, oldest first. Never mixed into sensor readings."""
    async with connection(conn) as c:
        rows = await c.fetch(
            """select * from access_events
                where unit_id = $1 and ($2::timestamptz is null or at >= $2)
                order by at, id""",
            unit_id, since,
        )
    return [_row_to_event(row) for row in rows]
