from datetime import datetime

import asyncpg

from app.db.pool import connection
from app.models import Reading


def _row_to_reading(row: asyncpg.Record) -> Reading:
    value = row["value_text"] if row["sensor"] == "door" else row["value_num"]
    return Reading(
        unit_id=row["unit_id"], sensor=row["sensor"], value=value, recorded_at=row["recorded_at"]
    )


async def insert_reading(reading: Reading, conn: asyncpg.Connection | None = None) -> Reading:
    is_door = reading.sensor == "door"
    async with connection(conn) as c:
        row = await c.fetchrow(
            """insert into readings (unit_id, sensor, value_num, value_text, recorded_at)
               values ($1, $2, $3, $4, $5)
               returning *""",
            reading.unit_id,
            reading.sensor,
            None if is_door else reading.value,
            reading.value if is_door else None,
            reading.recorded_at,
        )
    return _row_to_reading(row)


async def list_readings(
    unit_id: str, since: datetime | None = None, conn: asyncpg.Connection | None = None
) -> list[Reading]:
    """Readings for a unit, oldest first. With `since`, only readings at or after it."""
    async with connection(conn) as c:
        rows = await c.fetch(
            """select * from readings
                where unit_id = $1 and ($2::timestamptz is null or recorded_at >= $2)
                order by recorded_at, id""",
            unit_id,
            since,
        )
    return [_row_to_reading(r) for r in rows]
