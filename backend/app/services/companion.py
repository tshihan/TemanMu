"""Companion features (B5 messages, B10 buddy matching, PRD §6.4)."""

from datetime import datetime

import asyncpg

from app.db import community as db_community
from app.db import companion as db_companion
from app.db import units as db_units
from app.models import Buddy, BuddyMatch, CommunityActivity, CompanionMessage
from app.realtime import broadcast as realtime
from app.services.notifications import create_notification
from app.timeutil import utc_now


class CompanionError(Exception):
    """Base for request errors the API turns into 404/409 responses."""


class UnitNotFound(CompanionError):
    pass


class PresetNotFound(CompanionError):
    pass


class AlreadyMatched(CompanionError):
    pass


class NoSharedInterest(CompanionError):
    pass


# --- pure rules ---------------------------------------------------------------------------


def match_buddy(resident_interests: list[str], buddies: list[Buddy]) -> tuple[Buddy, str] | None:
    """First buddy sharing an interest with the resident (PRD §9.6). Pure.

    Buddies in the given (buddy_id) order; for each buddy, the resident's interests in seed
    order; the first interest the buddy also has wins (case-insensitive). Returns the buddy and
    the resident's interest, or None if nothing matches.
    """
    for buddy in buddies:
        theirs = {i.casefold() for i in buddy.interests}
        for interest in resident_interests:
            if interest.casefold() in theirs:
                return buddy, interest
    return None


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


# --- operations ---------------------------------------------------------------------------


async def _with_next_activity(match: BuddyMatch) -> BuddyMatch:
    activities = await db_community.list_activities(match.unit_id)
    next_activity = pick_next_activity(match.unit_id, match.shared_interest, activities, utc_now())
    return match.model_copy(update={"next_activity": next_activity})


async def get_buddy_match(unit_id: str) -> BuddyMatch | None:
    """The stored match with next_activity filled in, or None."""
    match = await db_companion.get_buddy_match(unit_id)
    return await _with_next_activity(match) if match else None


async def send_message(unit_id: str, from_name: str, preset_id: str) -> CompanionMessage:
    """Deliver a preset message as a one-way simulated voice call (PRD C6, §6.4).

    Always delivered, even if the resident is away or in an incident (§12 item 11 default).
    Deliberately does not touch the unit's status or quiet-gap data: answering the phone is not
    activity for the status rules (§5.2).
    """
    unit = await db_units.get_unit(unit_id)
    if unit is None:
        raise UnitNotFound("Unit not found")
    preset = await db_companion.get_preset(preset_id)
    if preset is None:
        raise PresetNotFound("Preset not found")

    message = await db_companion.insert_message(unit_id, from_name, preset, utc_now())
    await create_notification(
        "caregiver",
        unit_id,
        "message_delivered",
        f'Delivered to {unit.caregiver_relationship} by voice call: "{message.text}"',
    )
    # The 3D home plays the phone call from this event (S8).
    await realtime.broadcast("companion.message_delivered", message)
    return message


async def request_buddy(unit_id: str) -> BuddyMatch:
    """Match the resident with the first pre-seeded buddy sharing an interest (PRD C7, B10)."""
    unit = await db_units.get_unit(unit_id)
    if unit is None:
        raise UnitNotFound("Unit not found")
    if await db_companion.get_buddy_match(unit_id) is not None:
        raise AlreadyMatched("Already matched")

    found = match_buddy(await db_companion.list_interests(unit_id), await db_companion.list_buddies())
    if found is None:
        raise NoSharedInterest("No buddy shares an interest")
    buddy, shared_interest = found

    try:
        await db_companion.insert_buddy_match(unit_id, buddy.buddy_id, shared_interest, utc_now())
    except asyncpg.UniqueViolationError:
        # A double click raced past the check above; the primary key keeps one match.
        raise AlreadyMatched("Already matched") from None

    await create_notification(
        "caregiver",
        unit_id,
        "buddy_matched",
        f"{unit.caregiver_relationship} is matched with {buddy.name}, who also enjoys {shared_interest}",
    )
    match = await db_companion.get_buddy_match(unit_id)
    assert match is not None
    return await _with_next_activity(match)
