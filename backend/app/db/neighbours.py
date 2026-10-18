import json
from datetime import datetime, time

import asyncpg

from app.db.pool import connection


async def list_rhythms(conn: asyncpg.Connection | None = None) -> list[tuple[str, time, list[tuple[time, time]]]]:
    """(unit_id, wake, outings) for every unit, ordered by unit_id. Times are local."""
    async with connection(conn) as c:
        rows = await c.fetch("select * from resident_rhythms order by unit_id")
    return [
        (
            r["unit_id"],
            r["wake_local"],
            [(time.fromisoformat(o["start"]), time.fromisoformat(o["end"])) for o in json.loads(r["outings"])],
        )
        for r in rows
    ]


async def list_consented_unit_ids(conn: asyncpg.Connection | None = None) -> set[str]:
    async with connection(conn) as c:
        rows = await c.fetch("select unit_id from neighbour_consents")
    return {r["unit_id"] for r in rows}


async def set_consent(unit_id: str, at: datetime, conn: asyncpg.Connection | None = None) -> None:
    """Record consent. Already consenting is fine (keeps the original time)."""
    async with connection(conn) as c:
        await c.execute(
            """insert into neighbour_consents (unit_id, consented_at) values ($1, $2)
               on conflict (unit_id) do nothing""",
            unit_id,
            at,
        )


async def delete_consent(unit_id: str, conn: asyncpg.Connection | None = None) -> None:
    """Withdraw consent and drop every introduction the unit is part of, on either side."""
    async with connection(conn) as c, c.transaction():
        await c.execute(
            "delete from neighbour_introductions where unit_id = $1 or neighbour_unit_id = $1", unit_id
        )
        await c.execute("delete from neighbour_consents where unit_id = $1", unit_id)


async def get_introduction(unit_id: str, conn: asyncpg.Connection | None = None) -> asyncpg.Record | None:
    async with connection(conn) as c:
        return await c.fetchrow("select * from neighbour_introductions where unit_id = $1", unit_id)


async def insert_introduction(
    unit_id: str, neighbour_unit_id: str, requested_at: datetime, conn: asyncpg.Connection | None = None
) -> None:
    """Raises asyncpg.UniqueViolationError if the unit already requested one."""
    async with connection(conn) as c:
        await c.execute(
            """insert into neighbour_introductions (unit_id, neighbour_unit_id, requested_at)
               values ($1, $2, $3)""",
            unit_id,
            neighbour_unit_id,
            requested_at,
        )
