"""Companion features (B5 messages, B10 buddy matching, PRD §6.4)."""

from datetime import datetime

from app.db import community as db_community
from app.db import companion as db_companion
from app.models import BuddyMatch, CommunityActivity
from app.timeutil import utc_now


def pick_next_activity(
    unit_id: str, shared_interest: str, activities: list[CommunityActivity], now: datetime
) -> CommunityActivity | None:
    """The activity to show with a buddy match (plan §10.4). Pure.

    Earliest upcoming (starts_at >= now) activity near the unit whose title contains the shared
    interest (case-insensitive: "gardening" matches "Community Gardening Session"). If none
    does, the earliest upcoming activity near the unit; if there is none, None.
    """
    upcoming = sorted(
        (a for a in activities if a.near_unit_id == unit_id and a.starts_at >= now),
        key=lambda a: (a.starts_at, a.activity_id),
    )
    interest = shared_interest.casefold()
    for activity in upcoming:
        if interest in activity.title.casefold():
            return activity
    return upcoming[0] if upcoming else None


async def get_buddy_match(unit_id: str) -> BuddyMatch | None:
    """The stored match with next_activity filled in, or None."""
    match = await db_companion.get_buddy_match(unit_id)
    if match is None:
        return None
    activities = await db_community.list_activities(unit_id)
    next_activity = pick_next_activity(unit_id, match.shared_interest, activities, utc_now())
    return match.model_copy(update={"next_activity": next_activity})
