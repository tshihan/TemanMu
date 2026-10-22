"""Pure rules engine tests (no database)."""

from dataclasses import replace
from datetime import datetime, timedelta, timezone

import pytest

from app.models import Baseline, Reading
from app.rules import facts_from, is_activity, next_check_at, on_reading, on_tick, unresolved_reason
from app.rules import reasons
from app.rules.engine import UnitFacts

T0 = datetime(2026, 10, 15, 0, 0, 0, tzinfo=timezone.utc)
BASELINE = Baseline(usual_quiet_gap_seconds=30, usual_outing_seconds=45, standby_power_kw=0.15)


def clock(dt: datetime) -> str:
    return dt.strftime("%H:%M")


def facts(**overrides) -> UnitFacts:
    base = UnitFacts(
        unit_id="A-105",
        caregiver_relationship="Mum",
        status="routine",
        status_since=T0,
        water_lpm=0,
        power_kw=0.15,
        door="closed",
        last_water_activity_at=T0,
        last_caregiver_confirmation_at=None,
        last_door_event_at=None,
        baseline=BASELINE,
        incident_state=None,
    )
    return replace(base, **overrides)


def reading(sensor, value, seconds=10) -> Reading:
    return Reading(unit_id="A-105", sensor=sensor, value=value, recorded_at=T0 + timedelta(seconds=seconds))


def apply(f: UnitFacts, r: Reading) -> UnitFacts:
    """Fold a decision back into the facts, as the database would."""
    c = on_reading(f, r, clock).changes
    return replace(
        f,
        status=c.status or f.status,
        status_since=c.status_since or f.status_since,
        water_lpm=f.water_lpm if c.latest_water_lpm is None else c.latest_water_lpm,
        power_kw=f.power_kw if c.latest_power_kw is None else c.latest_power_kw,
        door=c.latest_door or f.door,
        last_water_activity_at=c.last_water_activity_at or f.last_water_activity_at,
        last_door_event_at=c.last_door_event_at or f.last_door_event_at,
    )


# --- activity ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("sensor", "value", "expected"),
    [
        ("water", 0, False),
        ("water", 6, True),
        ("electricity", 0.15, False),
        ("electricity", 0.16, True),
        ("door", "open", True),
        ("door", "closed", False),
    ],
)
def test_is_activity(sensor, value, expected):
    assert is_activity(sensor, value, BASELINE) is expected


# --- reading rules -----------------------------------------------------------------------


@pytest.mark.parametrize("state", ["grace", "notified", "acknowledged"])
def test_r1_activity_resolves_active_incident(state):
    f = facts(status="unusual_inactivity", incident_state=state)
    r = reading("water", 6)
    d = on_reading(f, r, clock)
    assert d.resolve_incident
    assert d.changes.status == "routine"
    assert d.changes.status_since == r.recorded_at
    assert d.changes.last_water_activity_at == r.recorded_at
    expected = "during grace period" if state == "grace" else "during the check"
    assert d.resolve_reason == f"Resolved: water use detected {expected}"
    assert d.changes.status_reason == d.resolve_reason


def test_r1_electricity_reanchors_and_names_kw():
    f = facts(status="unresolved_concern", incident_state="notified")
    r = reading("electricity", 1.8)
    d = on_reading(f, r, clock)
    assert d.resolve_incident
    assert d.changes.last_water_activity_at == r.recorded_at
    assert d.resolve_reason == "Resolved: electricity use (1.8 kW) detected during the check"


def test_r1_door_open_resolves():
    d = on_reading(facts(status="unusual_inactivity", incident_state="grace"), reading("door", "open"), clock)
    assert d.resolve_reason == "Resolved: door opened detected during grace period"


def test_r1_not_triggered_by_non_activity():
    d = on_reading(facts(status="unusual_inactivity", incident_state="grace"), reading("door", "closed"), clock)
    assert not d.resolve_incident
    assert d.changes.status is None


@pytest.mark.parametrize(
    ("sensor", "value", "previous"),
    [
        ("water", 6, {"water_lpm": 6}),
        ("water", 9, {"water_lpm": 6}),
        ("electricity", 1.8, {"power_kw": 1.8}),
        ("electricity", 1.9, {"power_kw": 1.8}),
        ("door", "open", {"door": "open"}),
    ],
)
def test_repeated_unchanged_load_does_not_resolve_incident(sensor, value, previous):
    d = on_reading(
        facts(status="unusual_inactivity", incident_state="grace", **previous),
        reading(sensor, value), clock,
    )
    assert not d.resolve_incident
    assert d.changes.status is None


def test_r2_door_open_while_away_is_back_home():
    r = reading("door", "open")
    d = on_reading(facts(status="possible_away"), r, clock)
    assert d.changes.status == "routine"
    assert d.changes.status_reason == "Door opened at 00:00: back home"
    assert d.changes.last_water_activity_at == r.recorded_at
    assert d.changes.status_since == r.recorded_at


def test_r3_door_open_while_idle_is_possible_away():
    r = reading("door", "open")
    d = on_reading(facts(), r, clock)
    assert d.changes.status == "possible_away"
    assert d.changes.status_since == r.recorded_at
    assert d.changes.status_reason == (
        "Door opened at 00:00, then no water use and electricity back to standby: probably out"
    )
    assert d.changes.last_door_event_at == r.recorded_at
    assert d.changes.latest_door == "open"
    assert d.changes.last_water_activity_at is None  # anchor unchanged


@pytest.mark.parametrize(
    ("water", "power", "signal"),
    [(0, 1.8, "electricity was"), (6, 0.15, "water was"), (6, 1.8, "water and electricity were")],
)
def test_r3_fails_when_something_is_on(water, power, signal):
    d = on_reading(facts(water_lpm=water, power_kw=power), reading("door", "open"), clock)
    assert d.changes.status is None
    assert d.changes.status_reason == f"Door opened at 00:00 while {signal} in use: at home"


@pytest.mark.parametrize(("sensor", "value", "word"), [("water", 6, "water"), ("electricity", 1.8, "electricity")])
def test_r4_activity_while_away_is_back_home(sensor, value, word):
    door_at = T0 + timedelta(minutes=5)
    f = facts(status="possible_away", last_door_event_at=door_at)
    r = reading(sensor, value, seconds=600)
    d = on_reading(f, r, clock)
    assert d.changes.status == "routine"
    assert d.changes.status_reason == f"Door opened at 00:05 and {word} use detected: back home"
    assert d.changes.last_water_activity_at == r.recorded_at


def test_r5_water_activity_while_routine():
    r = reading("water", 6)
    d = on_reading(facts(), r, clock)
    assert d.changes.status is None
    assert d.changes.status_reason == "Water activity within usual routine"
    assert d.changes.last_water_activity_at == r.recorded_at
    assert d.changes.latest_water_lpm == 6


def test_r5_electricity_while_routine_does_not_move_anchor():
    d = on_reading(facts(), reading("electricity", 1.8), clock)
    assert d.changes.status is None
    assert d.changes.status_reason == "Water and electricity activity within usual routine"
    assert d.changes.last_water_activity_at is None
    assert d.changes.latest_power_kw == 1.8


@pytest.mark.parametrize(
    ("sensor", "value"), [("water", 0), ("electricity", 0.15), ("door", "closed")]
)
@pytest.mark.parametrize("status", ["routine", "possible_away"])
def test_r6_non_activity_changes_no_status(sensor, value, status):
    d = on_reading(facts(status=status), reading(sensor, value), clock)
    assert not d.is_activity
    assert d.changes.status is None
    assert d.changes.status_reason is None


def test_door_closed_updates_latest_only():
    r = reading("door", "closed")
    d = on_reading(facts(status="possible_away", door="open"), r, clock)
    assert d.changes.status is None
    assert d.changes.latest_door == "closed"
    assert d.changes.last_door_event_at == r.recorded_at


def test_tap_off_keeps_anchor():
    d = on_reading(facts(water_lpm=6), reading("water", 0), clock)
    assert d.changes.latest_water_lpm == 0
    assert d.changes.last_water_activity_at is None


def test_going_out_sequence():
    f = facts()
    statuses = []
    for i, value in enumerate(["open", "closed", "open", "closed"]):
        f = apply(f, reading("door", value, seconds=10 * (i + 1)))
        statuses.append(f.status)
    assert statuses == ["possible_away", "possible_away", "routine", "routine"]


# --- time rules --------------------------------------------------------------------------


def test_t1_quiet_gap_one_second_before_and_at_deadline():
    f = facts()
    assert on_tick(f, T0 + timedelta(seconds=29), clock) is None
    d = on_tick(f, T0 + timedelta(seconds=30), clock)
    assert d is not None
    assert d.kind == "quiet_gap"
    assert d.detected_detail == "Water quiet gap exceeded"
    assert d.reason == (
        "No water use for 0:30, longer than usual maximum of 0:30. No door event. Electricity at standby"
    )


def test_caregiver_confirmation_restarts_watch_without_faking_water_use():
    confirmed = T0 + timedelta(seconds=20)
    f = facts(status_since=confirmed, last_caregiver_confirmation_at=confirmed)
    assert f.last_water_activity_at == T0
    assert next_check_at(f) == confirmed + timedelta(seconds=30)
    assert on_tick(f, confirmed + timedelta(seconds=29), clock) is None
    decision = on_tick(f, confirmed + timedelta(seconds=30), clock)
    assert decision is not None
    assert decision.detected_detail == "No water activity since caregiver confirmation"
    assert "caregiver spoke" in decision.reason


def test_water_after_caregiver_confirmation_becomes_quiet_gap_anchor():
    f = facts(last_caregiver_confirmation_at=T0 + timedelta(seconds=10),
              last_water_activity_at=T0 + timedelta(seconds=25))
    assert next_check_at(f) == T0 + timedelta(seconds=55)


def test_t1_reason_names_door_and_power():
    f = facts(power_kw=1.8, last_door_event_at=T0 + timedelta(seconds=5))
    d = on_tick(f, T0 + timedelta(seconds=34), clock)
    assert d.reason == (
        "No water use for 0:34, longer than usual maximum of 0:30. "
        "Last door event at 00:00. Electricity in use (1.8 kW)"
    )


def test_t1_door_before_anchor_is_not_mentioned():
    f = facts(last_door_event_at=T0 - timedelta(minutes=1))
    assert "No door event" in on_tick(f, T0 + timedelta(seconds=30), clock).reason


def test_t2_outing_timeout_one_second_before_and_at_deadline():
    f = facts(status="possible_away", status_since=T0, last_door_event_at=T0)
    assert on_tick(f, T0 + timedelta(seconds=44), clock) is None
    d = on_tick(f, T0 + timedelta(seconds=45), clock)
    assert d.kind == "outing_timeout"
    assert d.detected_detail == "Outing longer than usual"
    assert d.reason == "Door opened at 00:00, then no activity for 0:45, longer than usual outing of 0:45"


@pytest.mark.parametrize("state", ["grace", "notified", "acknowledged"])
def test_no_tick_while_incident_active(state):
    f = facts(status="unusual_inactivity", incident_state=state)
    assert on_tick(f, T0 + timedelta(hours=1), clock) is None


def test_next_check_at():
    assert next_check_at(facts()) == T0 + timedelta(seconds=30)
    assert next_check_at(facts(last_water_activity_at=None, status_since=T0)) == T0 + timedelta(seconds=30)
    since = T0 + timedelta(seconds=100)
    assert next_check_at(facts(status="possible_away", status_since=since)) == since + timedelta(seconds=45)
    assert next_check_at(facts(status="unusual_inactivity")) is None
    assert next_check_at(facts(status="unresolved_concern")) is None
    assert next_check_at(facts(incident_state="grace")) is None
    assert next_check_at(facts(status="possible_away", incident_state="acknowledged")) is None


# --- text --------------------------------------------------------------------------------


def test_format_duration():
    assert reasons.format_duration(34) == "0:34"
    assert reasons.format_duration(30) == "0:30"
    assert reasons.format_duration(605) == "10:05"
    assert reasons.format_duration(3725) == "1:02:05"


def test_unresolved_reason_adds_sentence():
    assert unresolved_reason("No water use for 0:30. Electricity at standby", "Mum") == (
        "No water use for 0:30. Electricity at standby. Mum did not answer the simulated call."
    )
    assert unresolved_reason("Done.", "Dad") == "Done. Dad did not answer the simulated call."


def test_lifecycle_texts():
    assert reasons.voice_call_started("Mum") == "Calling Mum (simulated)"
    assert reasons.reminder_detail(2) == "Reminder #2"
    assert reasons.morning_message("Mum", "door") == "Mum's day has started. Front door opened at home."
    assert reasons.morning_message("Mum", "water") == "Mum's day has started. Water used at home."
    assert reasons.morning_message("Mum", "electricity") == "Mum's day has started. Electricity used at home."
    assert reasons.alert_message("A-105", "Mdm Tan") == "Unresolved concern at A-105: Mdm Tan could not be reached."
    assert reasons.reminder_message(1, "A-105") == "Reminder #1: concern at A-105 still needs a response."
    assert reasons.acknowledged_message("Guard Ali") == "Guard Ali is checking now."
    assert reasons.closed_message("resident_ok") == "Incident closed: Resident OK."
    assert reasons.closed_message("resident_away") == "Incident closed: Resident was away."
    assert reasons.closed_reason("Guard Ali", "assistance_provided") == "Incident closed by Guard Ali: Assistance provided"
    assert reasons.auto_resolved_message("Mdm Tan") == "Mdm Tan activity detected. Concern resolved."


def test_facts_from_unit():
    from app.models import QuietGap, Unit, UnitLatest

    unit = Unit(
        unit_id="A-105",
        resident_name="Mdm Tan",
        caregiver_name="Mei",
        caregiver_relationship="Mum",
        controllable=True,
        status="routine",
        status_reason="",
        status_since=T0,
        latest=UnitLatest(water_lpm=0, power_kw=0.15, door="closed", last_door_event_at=None),
        quiet_gap=QuietGap(last_water_activity_at=T0, usual_max_seconds=30),
        baseline=BASELINE,
        active_incident_id=None,
    )
    f = facts_from(unit, "closed")
    assert f == facts()
    assert facts_from(unit, "grace").incident_state == "grace"
