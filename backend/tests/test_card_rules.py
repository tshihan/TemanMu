"""Card-home rules (no database): access-card taps decide outings, the door never does."""

from dataclasses import replace
from datetime import datetime, timedelta, timezone

from app.models import Baseline, LastAccess, Reading
from app.rules import next_check_at, on_access, on_reading, on_tick
from app.rules import reasons
from app.rules.engine import ARRIVAL_WINDOW_SECONDS, UnitFacts

T0 = datetime(2026, 10, 15, 2, 0, 0, tzinfo=timezone.utc)
BASELINE = Baseline(usual_quiet_gap_seconds=30, usual_outing_seconds=45, standby_power_kw=0.15)
LOBBY = "Block A lift lobby"


def clock(dt: datetime) -> str:
    return dt.strftime("%H:%M")


def card_home(**overrides) -> UnitFacts:
    base = UnitFacts(
        unit_id="A-105", caregiver_relationship="Mum", status="routine", status_since=T0,
        water_lpm=0, power_kw=0.15, door="closed", last_water_activity_at=T0,
        last_caregiver_confirmation_at=None, last_door_event_at=None, baseline=BASELINE,
        incident_state=None, outing_signal="card",
    )
    return replace(base, **overrides)


def at(seconds: float) -> datetime:
    return T0 + timedelta(seconds=seconds)


def tapped(f: UnitFacts, direction: str, seconds: float) -> UnitFacts:
    """Fold a tap back into the facts, as the database would."""
    c = on_access(f, direction, LOBBY, at(seconds), clock)
    return replace(
        f,
        status=c.status or f.status,
        status_since=c.status_since or f.status_since,
        last_water_activity_at=c.last_water_activity_at or f.last_water_activity_at,
        awaiting_arrival_since=None if c.clear_awaiting_arrival else c.awaiting_arrival_since or f.awaiting_arrival_since,
        last_access=LastAccess(direction=direction, access_point=LOBBY, at=at(seconds)),
    )


def test_tap_out_with_quiet_home_is_possible_away():
    c = on_access(card_home(), "out", LOBBY, at(10), clock)
    assert c.status == "possible_away"
    assert c.status_since == at(10)
    assert c.status_reason == reasons.tapped_out(LOBBY, "02:00")


def test_tap_out_with_activity_at_home_stays_routine():
    c = on_access(card_home(water_lpm=6), "out", LOBBY, at(10), clock)
    assert c.status is None  # already routine: unchanged
    assert c.status_reason == reasons.tapped_out_at_home(LOBBY, "02:00")


def test_out_too_long_is_not_back_yet():
    f = tapped(card_home(), "out", 10)
    assert next_check_at(f) == at(10 + 45)
    d = on_tick(f, at(60), clock)
    assert d.kind == "outing_timeout"
    assert d.detected_detail == reasons.DETECTED_NOT_BACK
    assert d.reason.startswith(f"Tapped out at {LOBBY}, 02:00, and not back yet")


def test_tap_in_starts_the_arrival_clock_instead_of_the_quiet_gap():
    f = tapped(tapped(card_home(), "out", 10), "in", 30)
    assert f.status == "routine"
    assert f.awaiting_arrival_since == at(30)
    assert next_check_at(f) == at(30 + ARRIVAL_WINDOW_SECONDS)
    assert on_tick(f, at(30 + ARRIVAL_WINDOW_SECONDS - 1), clock) is None
    d = on_tick(f, at(30 + ARRIVAL_WINDOW_SECONDS), clock)
    assert d.kind == "arrival_timeout"
    assert d.detected_detail == reasons.DETECTED_ARRIVAL


def test_activity_after_tap_in_means_back_home():
    f = tapped(tapped(card_home(), "out", 10), "in", 30)
    r = Reading(unit_id="A-105", sensor="electricity", value=1.8, recorded_at=at(35))
    c = on_reading(f, r, clock).changes
    assert c.clear_awaiting_arrival is True
    assert c.status_reason == reasons.home_after_tap_in(LOBBY, "02:00", "electricity")


def test_activity_while_out_without_tap_in_is_back_home():
    """A missed tap in: water use at home still brings her back."""
    f = tapped(card_home(), "out", 10)
    r = Reading(unit_id="A-105", sensor="water", value=6, recorded_at=at(30))
    c = on_reading(f, r, clock).changes
    assert c.status == "routine"
    assert c.status_reason == reasons.back_home_activity(None, "water")


def test_no_tap_and_quiet_home_is_ordinary_inactivity():
    f = card_home()
    d = on_tick(f, at(31), clock)
    assert d.kind == "quiet_gap"
    assert d.detected_detail == reasons.DETECTED_QUIET_GAP


def test_door_never_decides_an_outing_in_a_card_home():
    r = Reading(unit_id="A-105", sensor="door", value="open", recorded_at=at(10))
    c = on_reading(card_home(), r, clock).changes
    assert c.status is None
    assert c.latest_door == "open"
    away = tapped(card_home(), "out", 5)
    assert on_reading(away, r, clock).changes.status is None  # not "back home" either


def test_door_home_keeps_door_rules():
    r = Reading(unit_id="A-105", sensor="door", value="open", recorded_at=at(10))
    c = on_reading(card_home(outing_signal="door"), r, clock).changes
    assert c.status == "possible_away"


def test_taps_never_resolve_or_change_an_open_incident():
    for direction in ("out", "in"):
        c = on_access(card_home(incident_state="notified"), direction, LOBBY, at(10), clock)
        assert c.as_kwargs() == {}


def test_tap_out_clears_a_pending_arrival():
    f = tapped(tapped(card_home(), "out", 10), "in", 30)
    f = tapped(f, "out", 40)
    assert f.awaiting_arrival_since is None
    assert f.status == "possible_away"
