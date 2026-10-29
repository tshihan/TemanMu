from datetime import datetime

import asyncpg

from app.db.pool import connection


async def create_away_period(
    unit_id: str,
    starts_at: datetime,
    ends_at: datetime,
    reason: str | None,
    created_by: str,
    created_at: datetime,
    conn: asyncpg.Connection | None = None,
) -> str:
    """Insert a period and return its period_id."""
    async with connection(conn) as c:
        return await c.fetchval(
            """insert into away_periods (unit_id, starts_at, ends_at, reason, created_by, created_at)
               values ($1, $2, $3, $4, $5, $6) returning period_id""",
            unit_id, starts_at, ends_at, reason, created_by, created_at,
        )


async def get_away_period(period_id: str, conn: asyncpg.Connection | None = None) -> asyncpg.Record | None:
    async with connection(conn) as c:
        return await c.fetchrow("select * from away_periods where period_id = $1", period_id)


async def list_current(unit_id: str, conn: asyncpg.Connection | None = None) -> list[asyncpg.Record]:
    """Current and upcoming periods, earliest first, with their reasons (caregiver only)."""
    async with connection(conn) as c:
        return await c.fetch(
            """select period_id, starts_at, ends_at, created_at, reason from away_periods
                where unit_id = $1 and cancelled_at is null and ends_at > now() order by starts_at""",
            unit_id,
        )


async def overlaps(
    unit_id: str, starts_at: datetime, ends_at: datetime, conn: asyncpg.Connection | None = None
) -> bool:
    async with connection(conn) as c:
        return await c.fetchval(
            """select exists (select 1 from away_periods
                               where unit_id = $1 and cancelled_at is null
                                 and starts_at < $3 and ends_at > $2)""",
            unit_id, starts_at, ends_at,
        )


async def end_away_period(period_id: str, at: datetime, conn: asyncpg.Connection | None = None) -> None:
    """A period that has started ends now; one that has not started yet is cancelled."""
    async with connection(conn) as c:
        await c.execute(
            """update away_periods
                  set ends_at = case when starts_at < $2 then $2 else ends_at end,
                      cancelled_at = case when starts_at < $2 then null else $2 end
                where period_id = $1""",
            period_id, at,
        )


async def list_windows(unit_id: str, conn: asyncpg.Connection | None = None) -> list[tuple[datetime, datetime]]:
    """(starts_at, ends_at) of every period that was not cancelled, past ones included."""
    async with connection(conn) as c:
        rows = await c.fetch(
            """select starts_at, ends_at from away_periods
                where unit_id = $1 and cancelled_at is null order by starts_at""",
            unit_id,
        )
    return [(r["starts_at"], r["ends_at"]) for r in rows]


async def claim_activity_notice(unit_id: str, at: datetime, conn: asyncpg.Connection | None = None) -> bool:
    """Mark the period covering `at` as notified. True only the first time, so one notice per period."""
    async with connection(conn) as c:
        period_id = await c.fetchval(
            """update away_periods set activity_notified_at = $2
                where unit_id = $1 and cancelled_at is null and activity_notified_at is null
                  and starts_at <= $2 and ends_at > $2
               returning period_id""",
            unit_id, at,
        )
    return period_id is not None


async def is_away(unit_id: str, at: datetime, conn: asyncpg.Connection | None = None) -> bool:
    async with connection(conn) as c:
        return await c.fetchval(
            """select exists (select 1 from away_periods
                               where unit_id = $1 and cancelled_at is null
                                 and starts_at <= $2 and ends_at > $2)""",
            unit_id, at,
        )
