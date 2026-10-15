from datetime import datetime

import asyncpg

from app.db.pool import connection
from app.models import Buddy, BuddyMatch, CompanionMessage, MessagePreset


async def list_presets(conn: asyncpg.Connection | None = None) -> list[MessagePreset]:
    async with connection(conn) as c:
        rows = await c.fetch("select * from message_presets order by preset_id")
    return [MessagePreset(**dict(r)) for r in rows]


async def get_preset(preset_id: str, conn: asyncpg.Connection | None = None) -> MessagePreset | None:
    async with connection(conn) as c:
        row = await c.fetchrow("select * from message_presets where preset_id = $1", preset_id)
    return MessagePreset(**dict(row)) if row else None


async def insert_message(
    unit_id: str,
    from_name: str,
    preset: MessagePreset,
    sent_at: datetime,
    conn: asyncpg.Connection | None = None,
) -> CompanionMessage:
    """Record a delivered one-way voice-call message. text is copied from the preset."""
    async with connection(conn) as c:
        row = await c.fetchrow(
            """insert into companion_messages (unit_id, from_name, preset_id, text, sent_at)
               values ($1, $2, $3, $4, $5)
               returning *""",
            unit_id,
            from_name,
            preset.preset_id,
            preset.text,
            sent_at,
        )
    return CompanionMessage(**dict(row))


async def list_messages(unit_id: str, conn: asyncpg.Connection | None = None) -> list[CompanionMessage]:
    """Newest first."""
    async with connection(conn) as c:
        rows = await c.fetch(
            "select * from companion_messages where unit_id = $1 order by sent_at desc", unit_id
        )
    return [CompanionMessage(**dict(r)) for r in rows]


async def list_buddies(conn: asyncpg.Connection | None = None) -> list[Buddy]:
    """Ordered by buddy_id (buddy matching depends on this order)."""
    async with connection(conn) as c:
        rows = await c.fetch("select * from buddies order by buddy_id")
    return [Buddy(**dict(r)) for r in rows]


async def list_interests(unit_id: str, conn: asyncpg.Connection | None = None) -> list[str]:
    """The resident's interests in seed order (buddy matching depends on this order)."""
    async with connection(conn) as c:
        rows = await c.fetch(
            "select interest from resident_interests where unit_id = $1 order by position", unit_id
        )
    return [r["interest"] for r in rows]


async def get_buddy_match(unit_id: str, conn: asyncpg.Connection | None = None) -> BuddyMatch | None:
    """The stored match, or None.

    next_activity is always None here: it depends on the current time and the activity list,
    so services.companion fills it in (Phase 10.4) before the API returns it.
    """
    async with connection(conn) as c:
        row = await c.fetchrow(
            """select m.unit_id, m.shared_interest, m.matched_at,
                      b.buddy_id, b.name, b.interests
                 from buddy_matches m
                 join buddies b on b.buddy_id = m.buddy_id
                where m.unit_id = $1""",
            unit_id,
        )
    if row is None:
        return None
    return BuddyMatch(
        unit_id=row["unit_id"],
        buddy=Buddy(buddy_id=row["buddy_id"], name=row["name"], interests=row["interests"]),
        shared_interest=row["shared_interest"],
        next_activity=None,
        matched_at=row["matched_at"],
    )


async def insert_buddy_match(
    unit_id: str,
    buddy_id: str,
    shared_interest: str,
    matched_at: datetime,
    conn: asyncpg.Connection | None = None,
) -> None:
    """Raises asyncpg.UniqueViolationError if the unit is already matched."""
    async with connection(conn) as c:
        await c.execute(
            """insert into buddy_matches (unit_id, buddy_id, shared_interest, matched_at)
               values ($1, $2, $3, $4)""",
            unit_id,
            buddy_id,
            shared_interest,
            matched_at,
        )
