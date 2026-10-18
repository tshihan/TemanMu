"""Same-hour neighbours: suggest a resident who keeps the same hours (companion feature).

Friendships form between people whose daily paths cross, so this matches residents by when
they go out, not by interest (that is Community Buddy). Only coarse labels ever leave this
module: no wake times, outing windows or the neighbour's unit_id, since knowing "she leaves
every day at 7" would help a burglar. Both residents must consent, and a person (the community
coordinator) makes the introduction; the app never contacts the other family.
"""

from dataclasses import dataclass
from datetime import datetime, time
from zoneinfo import ZoneInfo

import asyncpg

from app.db import community as db_community
from app.db import neighbours as db_neighbours
from app.db import units as db_units
from app.models import CommunityActivity, NeighbourMatch, NeighbourState
from app.services.companion import CompanionError, UnitNotFound
from app.services.notifications import create_notification
from app.settings import settings
from app.timeutil import utc_now


class NotOptedIn(CompanionError):
    pass


class NoNeighbourMatch(CompanionError):
    pass


class AlreadyRequested(CompanionError):
    pass


# --- pure rules ---------------------------------------------------------------------------

Window = tuple[time, time]


@dataclass(frozen=True)
class Rhythm:
    """A resident's typical day in local time (seeded; see app.seed.SeedRhythm)."""

    unit_id: str
    wake: time
    outings: list[Window]


def _minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def overlap_minutes(a: Rhythm, b: Rhythm) -> tuple[int, Window | None]:
    """Total minutes the two residents' outing windows overlap, and the longest single overlap
    (earliest first on a tie). Windows that only touch overlap by 0 minutes. Pure."""
    total, longest, longest_len = 0, None, 0
    for a_start, a_end in a.outings:
        for b_start, b_end in b.outings:
            start, end = max(a_start, b_start), min(a_end, b_end)
            length = _minutes(end) - _minutes(start)
            if length <= 0:
                continue
            total += length
            if length > longest_len or (length == longest_len and longest and start < longest[0]):
                longest, longest_len = (start, end), length
    return total, longest


def best_neighbour(me: Rhythm, candidates: list[Rhythm], min_overlap: int) -> tuple[Rhythm, Window] | None:
    """The candidate whose outings overlap mine most (at least min_overlap minutes), with the
    longest shared window. Ties: closest wake time, then unit_id. Pure.

    `candidates` must already exclude `me` and anyone without consent.
    """
    scored = []
    for other in candidates:
        total, window = overlap_minutes(me, other)
        if window is None or total < min_overlap:
            continue
        wake_diff = abs(_minutes(me.wake) - _minutes(other.wake))
        scored.append((-total, wake_diff, other.unit_id, other, window))
    if not scored:
        return None
    _, _, _, other, window = min(scored, key=lambda s: s[:3])
    return other, window


def part_of_day(t: time) -> str:
    if t < time(12, 0):
        return "morning"
    return "afternoon" if t < time(17, 0) else "evening"


def shared_labels(me: Rhythm, them: Rhythm, window: Window, early_before: time) -> list[str]:
    """Coarse labels both residents share, e.g. ["early risers", "morning outings"]. Pure."""
    labels = []
    if me.wake < early_before and them.wake < early_before:
        labels.append("early risers")
    labels.append(f"{part_of_day(window[0])} outings")
    return labels


def pick_meeting_activity(
    window: Window, activities: list[CommunityActivity], now: datetime, tz: str
) -> CommunityActivity | None:
    """An activity whose local start time falls inside the shared window, so it fits both their
    days. Any township activity will do (near_unit_id is ignored). Upcoming ones first, then
    the earliest. Pure."""
    zone = ZoneInfo(tz)
    start, end = window
    fitting = [a for a in activities if start <= a.starts_at.astimezone(zone).time() <= end]
    if not fitting:
        return None
    return min(fitting, key=lambda a: (a.starts_at < now, a.starts_at, a.activity_id))


def floor_of(unit_id: str) -> int:
    """"A-104" -> 1: the digits without the last two (the unit on the floor)."""
    digits = unit_id.split("-")[-1]
    return int(digits[:-2] or 0)


# --- operations ---------------------------------------------------------------------------


async def _require_unit(unit_id: str):
    unit = await db_units.get_unit(unit_id)
    if unit is None:
        raise UnitNotFound("Unit not found")
    return unit


async def _find_match(unit_id: str) -> tuple[str, NeighbourMatch] | None:
    """The consented best neighbour for a consented unit: (neighbour_unit_id, public match)."""
    consented = await db_neighbours.list_consented_unit_ids()
    rhythms = {u: Rhythm(u, wake, outings) for u, wake, outings in await db_neighbours.list_rhythms()}
    me = rhythms.get(unit_id)
    if me is None or unit_id not in consented:
        return None
    candidates = [r for u, r in rhythms.items() if u != unit_id and u in consented]
    found = best_neighbour(me, candidates, settings.neighbour_min_overlap_minutes)
    if found is None:
        return None
    other, window = found
    neighbour = await db_units.get_unit(other.unit_id)
    assert neighbour is not None
    activities = await db_community.list_activities()
    return other.unit_id, NeighbourMatch(
        name=neighbour.resident_name,
        floor=floor_of(other.unit_id),
        labels=shared_labels(me, other, window, settings.neighbour_early_riser_before),
        meeting_activity=pick_meeting_activity(window, activities, utc_now(), settings.demo_timezone),
    )


async def get_state(unit_id: str) -> NeighbourState:
    """The caregiver's view. The match is computed live, so a withdrawal shows at once."""
    await _require_unit(unit_id)
    opted_in = unit_id in await db_neighbours.list_consented_unit_ids()
    found = await _find_match(unit_id) if opted_in else None
    intro = await db_neighbours.get_introduction(unit_id)
    return NeighbourState(
        unit_id=unit_id,
        opted_in=opted_in,
        match=found[1] if found else None,
        introduction_requested_at=intro["requested_at"] if intro else None,
    )


async def set_consent(unit_id: str, open: bool) -> NeighbourState:
    """Opt in (idempotent) or withdraw. Withdrawing also removes the unit from every
    introduction, so it disappears from other residents' suggestions straight away."""
    await _require_unit(unit_id)
    if open:
        await db_neighbours.set_consent(unit_id, utc_now())
    else:
        await db_neighbours.delete_consent(unit_id)
    return await get_state(unit_id)


async def request_introduction(unit_id: str) -> NeighbourState:
    """Record a request for the community coordinator to introduce the pair in person.

    Recorded only: nobody is contacted. Adds a caregiver notification (never a township one).
    """
    unit = await _require_unit(unit_id)
    if unit_id not in await db_neighbours.list_consented_unit_ids():
        raise NotOptedIn("Resident has not agreed to be introduced")
    if await db_neighbours.get_introduction(unit_id) is not None:
        raise AlreadyRequested("Introduction already requested")
    found = await _find_match(unit_id)
    if found is None:
        raise NoNeighbourMatch("No neighbour keeps the same hours")
    neighbour_unit_id, match = found

    try:
        await db_neighbours.insert_introduction(unit_id, neighbour_unit_id, utc_now())
    except asyncpg.UniqueViolationError:
        # A double click raced past the check above; the primary key keeps one request.
        raise AlreadyRequested("Introduction already requested") from None

    await create_notification(
        "caregiver",
        unit_id,
        "neighbour_introduced",
        f"Introduction requested. The community coordinator will arrange for "
        f"{unit.caregiver_relationship} to meet {match.name}.",
    )
    return await get_state(unit_id)
