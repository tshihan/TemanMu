"""Pure status rules (PRD §7): facts in, decision out. No I/O, no clock, no settings.

Rules are numbered as in backend1-implementation.md §3.2 (R1–R6) and §3.3 (T1–T2).
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

from app.models import (
    ACTIVE_INCIDENT_STATES,
    AccessDirection,
    Baseline,
    DoorState,
    IncidentState,
    LastAccess,
    OutingSignal,
    Reading,
    Sensor,
    Status,
    Unit,
)
from app.rules import reasons
from app.rules.reasons import ClockText


# Card homes: how long after a tap in, with no water or electricity use, before a concern opens.
# Demo-length, like the other baselines; a real home would use minutes.
ARRIVAL_WINDOW_SECONDS = 20


def utc_hhmm(dt: datetime) -> str:
    """Default clock text. Production passes app.timeutil.local_hhmm instead."""
    return dt.astimezone(timezone.utc).strftime("%H:%M")


@dataclass(frozen=True)
class UnitFacts:
    unit_id: str
    caregiver_relationship: str
    status: Status
    status_since: datetime
    water_lpm: float
    power_kw: float
    door: DoorState
    last_water_activity_at: datetime | None
    last_caregiver_confirmation_at: datetime | None
    last_door_event_at: datetime | None
    baseline: Baseline
    incident_state: IncidentState | None  # active incident only; None if none
    # (starts_at, ends_at) of caregiver-declared away periods, past ones included.
    away_windows: tuple[tuple[datetime, datetime], ...] = ()
    in_hospital: bool = False
    # Card homes decide outings from card taps; the door never does.
    outing_signal: OutingSignal = "door"
    last_access: LastAccess | None = None
    awaiting_arrival_since: datetime | None = None


@dataclass(frozen=True)
class UnitChanges:
    """Keyword args for db.units.update_unit_state (None = unchanged)."""

    status: Status | None = None
    status_reason: str | None = None
    status_since: datetime | None = None
    last_water_activity_at: datetime | None = None
    last_door_event_at: datetime | None = None
    latest_water_lpm: float | None = None
    latest_power_kw: float | None = None
    latest_door: DoorState | None = None
    awaiting_arrival_since: datetime | None = None
    clear_awaiting_arrival: bool = False

    def as_kwargs(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v is not None and v is not False}


@dataclass(frozen=True)
class ReadingDecision:
    changes: UnitChanges
    is_activity: bool
    resolve_incident: bool  # R1
    resolve_reason: str | None  # A1 text when resolve_incident


@dataclass(frozen=True)
class TickDecision:
    kind: Literal["quiet_gap", "outing_timeout", "arrival_timeout", "continuous_water", "sustained_power"]
    reason: str  # U1 / U2 / U4 / U5
    detected_detail: str  # "Water quiet gap exceeded" / "Outing longer than usual"


def _has_active_incident(facts: UnitFacts) -> bool:
    return facts.incident_state in ACTIVE_INCIDENT_STATES


def is_activity(sensor: Sensor, value: float | str, baseline: Baseline) -> bool:
    if sensor == "door":
        return value == "open"
    if isinstance(value, str):
        return False
    if sensor == "water":
        return value > 0
    return value > baseline.standby_power_kw


def on_reading(facts: UnitFacts, reading: Reading, clock_text: ClockText = utc_hhmm) -> ReadingDecision:
    at = reading.recorded_at
    value = reading.value

    # Latest values are always updated.
    latest: dict = {}
    water_lpm, power_kw = facts.water_lpm, facts.power_kw
    if reading.sensor == "water":
        water_lpm = float(value)
        latest["latest_water_lpm"] = water_lpm
        if water_lpm > 0:
            latest["last_water_activity_at"] = at
    elif reading.sensor == "electricity":
        power_kw = float(value)
        latest["latest_power_kw"] = power_kw
    else:
        latest["latest_door"] = value
        latest["last_door_event_at"] = at

    activity = is_activity(reading.sensor, value, facts.baseline)
    card_home = facts.outing_signal == "card"
    # Card homes: water or electricity use after a tap in means she reached the flat.
    arrived = card_home and activity and reading.sensor != "door" and facts.awaiting_arrival_since is not None
    if arrived:
        latest["clear_awaiting_arrival"] = True
    # A repeated meter sample of an unchanged load is not new resident activity.
    new_activity = activity and (
        (reading.sensor == "door" and facts.door != "open") or
        (reading.sensor == "water" and facts.water_lpm <= 0) or
        (reading.sensor == "electricity" and facts.power_kw <= facts.baseline.standby_power_kw)
    )

    def decide(**status_changes) -> ReadingDecision:
        return ReadingDecision(
            changes=UnitChanges(**{**latest, **status_changes}),
            is_activity=activity,
            resolve_incident=False,
            resolve_reason=None,
        )

    if facts.in_hospital:
        return decide()

    # R6: not activity (tap off, kettle off, door closed) → no status change.
    if not activity:
        return decide()

    back_home = dict(status="routine", status_since=at, last_water_activity_at=at)

    # R1: activity resolves an active incident.
    if _has_active_incident(facts) and not new_activity:
        return decide()
    if _has_active_incident(facts):
        reason = reasons.resolved_reason(
            reasons.activity_signal(reading.sensor, value), during_grace=facts.incident_state == "grace"
        )
        return ReadingDecision(
            changes=UnitChanges(**{**latest, **back_home, "status_reason": reason}),
            is_activity=True,
            resolve_incident=True,
            resolve_reason=reason,
        )

    # Card homes: the door is activity at home only and never decides an outing.
    if reading.sensor == "door" and card_home:
        return decide()

    if reading.sensor == "door":
        clock = clock_text(at)
        # R2: door open while possibly away → back home.
        if facts.status == "possible_away":
            return decide(**back_home, status_reason=reasons.back_home_door(clock))
        water_on = water_lpm > 0
        power_on = power_kw > facts.baseline.standby_power_kw
        # R3: door open while idle at home → probably out.
        if facts.status == "routine" and not water_on and not power_on:
            return decide(status="possible_away", status_since=at, status_reason=reasons.probably_out(clock))
        # N3: door open while something is in use → still at home.
        return decide(**_to_routine(facts, at), status_reason=reasons.door_open_at_home(clock, water_on, power_on))

    # R4: water or electricity activity while possibly away → back home.
    if facts.status == "possible_away":
        door_clock = clock_text(facts.last_door_event_at) if facts.last_door_event_at and not card_home else None
        return decide(**back_home, status_reason=reasons.back_home_activity(door_clock, reading.sensor))

    # C5: first water or electricity use after a tap in.
    if arrived and facts.last_access is not None:
        reason = reasons.home_after_tap_in(facts.last_access.access_point, clock_text(facts.last_access.at), reading.sensor)
        return decide(**_to_routine(facts, at), status_reason=reason)

    # R5: any other activity → routine, refresh the reason line.
    reason = reasons.routine_water() if reading.sensor == "water" else reasons.routine_electricity()
    return decide(**_to_routine(facts, at), status_reason=reason)


def on_access(
    facts: UnitFacts, direction: AccessDirection, access_point: str, at: datetime, clock_text: ClockText = utc_hhmm
) -> UnitChanges:
    """A card tap in a card home. A tap suggests an outing or a return; it never proves safety,
    so it does not resolve an open incident, and activity at home outweighs it."""
    if facts.in_hospital or _has_active_incident(facts):
        return UnitChanges()
    clock = clock_text(at)
    in_use = facts.water_lpm > 0 or facts.power_kw > facts.baseline.standby_power_kw
    if direction == "out":
        if in_use:  # C2: someone is home; a lent card or a missed tap must not mark her out
            return UnitChanges(
                **_to_routine(facts, at),
                status_reason=reasons.tapped_out_at_home(access_point, clock),
                clear_awaiting_arrival=True,
            )
        return UnitChanges(  # C1
            status="possible_away",
            status_since=at,
            status_reason=reasons.tapped_out(access_point, clock),
            clear_awaiting_arrival=True,
        )
    # Tap in: back in the building. The quiet-gap clock restarts, as when coming home.
    back = dict(status="routine", status_since=at, last_water_activity_at=at)
    if in_use:  # C4
        return UnitChanges(**back, status_reason=reasons.tapped_in_at_home(access_point, clock), clear_awaiting_arrival=True)
    return UnitChanges(**back, status_reason=reasons.tapped_in(access_point, clock), awaiting_arrival_since=at)  # C3


def _awaiting_arrival(facts: UnitFacts) -> bool:
    return facts.outing_signal == "card" and facts.status == "routine" and facts.awaiting_arrival_since is not None


def _to_routine(facts: UnitFacts, at: datetime) -> dict:
    """Stay routine. A unit stuck in an incident status with no active incident returns to routine."""
    if facts.status == "routine":
        return {}
    return dict(status="routine", status_since=at, last_water_activity_at=at)


def _quiet_anchor(facts: UnitFacts) -> datetime:
    return max(
        (at for at in (facts.last_water_activity_at, facts.last_caregiver_confirmation_at) if at is not None),
        default=facts.status_since,
    )


def _after_away(facts: UnitFacts, anchor: datetime, seconds: int) -> tuple[datetime, bool]:
    """Restart a T1/T2 clock at the end of any away period that begins before it would fire.

    Returns the clock's start and whether an away period moved it.
    """
    moved = False
    for start, end in sorted(facts.away_windows):
        if end > anchor and start <= anchor + timedelta(seconds=seconds):
            anchor, moved = end, True
    return anchor, moved


def _clock(facts: UnitFacts) -> tuple[datetime, int, bool] | None:
    """(start, length in seconds, moved by an away period) of the T1 or T2 clock now running."""
    if facts.in_hospital or _has_active_incident(facts):
        return None
    if _awaiting_arrival(facts):
        seconds, anchor = ARRIVAL_WINDOW_SECONDS, facts.awaiting_arrival_since
    elif facts.status == "routine":
        seconds, anchor = facts.baseline.usual_quiet_gap_seconds, _quiet_anchor(facts)
    elif facts.status == "possible_away":
        seconds, anchor = facts.baseline.usual_outing_seconds, facts.status_since
    else:
        return None
    start, moved = _after_away(facts, anchor, seconds)
    return start, seconds, moved


def next_check_at(facts: UnitFacts) -> datetime | None:
    """When T1 or T2 would fire; None while an incident is active or in any other status.

    Away periods pause both: the clock restarts when the period ends.
    """
    clock = _clock(facts)
    return None if clock is None else clock[0] + timedelta(seconds=clock[1])


def on_tick(facts: UnitFacts, now: datetime, clock_text: ClockText = utc_hhmm) -> TickDecision | None:
    clock = _clock(facts)
    if clock is None or now < clock[0] + timedelta(seconds=clock[1]):
        return None
    start, _, after_away = clock

    if after_away:  # T1 or T2, counted from the end of an away period
        return TickDecision(
            kind="quiet_gap" if facts.status == "routine" else "outing_timeout",
            reason=reasons.after_away_reason(facts.caregiver_relationship, clock_text(start), (now - start).total_seconds()),
            detected_detail=reasons.DETECTED_AFTER_AWAY if facts.status == "routine" else reasons.DETECTED_OUTING,
        )

    if _awaiting_arrival(facts) and facts.last_access is not None:  # T3: tapped in, flat still quiet
        return TickDecision(
            kind="arrival_timeout",
            reason=reasons.arrival_reason(
                facts.last_access.access_point, clock_text(start), (now - start).total_seconds()
            ),
            detected_detail=reasons.DETECTED_ARRIVAL,
        )

    if facts.status == "routine":  # T1
        anchor = _quiet_anchor(facts)
        door = facts.last_door_event_at
        door_clock = clock_text(door) if door is not None and door > anchor else None
        return TickDecision(
            kind="quiet_gap",
            reason=(
                f"No water use since confirmed contact with {facts.caregiver_relationship}; "
                "another check is needed."
                if facts.last_caregiver_confirmation_at == anchor else
                reasons.quiet_gap_reason(
                    (now - anchor).total_seconds(),
                    facts.baseline.usual_quiet_gap_seconds,
                    door_clock,
                    facts.power_kw,
                    facts.baseline.standby_power_kw,
                )
            ),
            detected_detail=(
                "No water activity since confirmed contact"
                if facts.last_caregiver_confirmation_at == anchor else reasons.DETECTED_QUIET_GAP
            ),
        )

    # T2: possible_away for longer than the usual outing.
    tap = facts.last_access
    if facts.outing_signal == "card" and tap is not None and tap.direction == "out":
        return TickDecision(
            kind="outing_timeout",
            reason=reasons.not_back_reason(
                tap.access_point, clock_text(tap.at),
                (now - facts.status_since).total_seconds(), facts.baseline.usual_outing_seconds,
            ),
            detected_detail=reasons.DETECTED_NOT_BACK,
        )
    door_clock = clock_text(facts.last_door_event_at or facts.status_since)
    return TickDecision(
        kind="outing_timeout",
        reason=reasons.outing_reason(
            door_clock, (now - facts.status_since).total_seconds(), facts.baseline.usual_outing_seconds
        ),
        detected_detail=reasons.DETECTED_OUTING,
    )


def unresolved_reason(current_reason: str, relationship: str) -> str:
    return reasons.unresolved_reason(current_reason, relationship)


def facts_from(
    unit: Unit,
    incident_state: IncidentState | None,
    away_windows: tuple[tuple[datetime, datetime], ...] = (),
) -> UnitFacts:
    return UnitFacts(
        unit_id=unit.unit_id,
        caregiver_relationship=unit.caregiver_relationship,
        status=unit.status,
        status_since=unit.status_since,
        water_lpm=unit.latest.water_lpm,
        power_kw=unit.latest.power_kw,
        door=unit.latest.door,
        last_water_activity_at=unit.quiet_gap.last_water_activity_at,
        last_caregiver_confirmation_at=unit.quiet_gap.last_caregiver_confirmation_at,
        last_door_event_at=unit.latest.last_door_event_at,
        baseline=unit.baseline,
        incident_state=incident_state if incident_state in ACTIVE_INCIDENT_STATES else None,
        away_windows=away_windows,
        in_hospital=unit.care_state == "in_hospital",
        outing_signal=unit.outing_signal,
        last_access=unit.last_access,
        awaiting_arrival_since=unit.awaiting_arrival_since,
    )
