import asyncpg

from app.db.pool import connection
from app.models import CommunityAction, CommunityActivity
from app.timeutil import utc_now


async def list_activities(
    unit_id: str | None = None, conn: asyncpg.Connection | None = None
) -> list[CommunityActivity]:
    """Activities ordered by starts_at. With unit_id, only those near that unit."""
    async with connection(conn) as c:
        rows = await c.fetch(
            """select * from community_activities
                where ($1::text is null or near_unit_id = $1)
                order by starts_at, activity_id""",
            unit_id,
        )
    return [CommunityActivity(**dict(r)) for r in rows]


async def get_activity(
    activity_id: str, conn: asyncpg.Connection | None = None
) -> CommunityActivity | None:
    async with connection(conn) as c:
        row = await c.fetchrow("select * from community_activities where activity_id = $1", activity_id)
    return CommunityActivity(**dict(row)) if row else None


async def insert_response(
    activity_id: str, action: CommunityAction, conn: asyncpg.Connection | None = None
) -> None:
    async with connection(conn) as c:
        await c.execute(
            "insert into community_responses (activity_id, action, created_at) values ($1, $2, $3)",
            activity_id,
            action,
            utc_now(),
        )
