"""Automatic incident lifecycle tests against a real Postgres (TEST_DATABASE_URL).

Durations are shortened: grace 1 s, reminders every 1 s, the voice call rings for 0.2 s.
"""

import asyncio
import os
from datetime import timedelta

import pytest

from app import timers
from app.db import incidents, notifications, units
from app.services import monitoring
from app.services.reset import reset_demo
from app.settings import settings
from app.timeutil import iso, utc_now

pytestmark = pytest.mark.skipif(
    not os.environ.get("TEST_DATABASE_URL"),
    reason="set TEST_DATABASE_URL to a separate Postgres to run database tests (never the demo database)",
)

UNIT = "A-105"


@pytest.fixture(autouse=True)
def fast_timers(monkeypatch):
    monkeypatch.setattr(settings, "grace_period_seconds", 1)
    monkeypatch.setattr(settings, "reminder_interval_seconds", 1)
    monkeypatch.setattr(settings, "voice_call_ring_seconds", 0.2)


@pytest.fixture(autouse=True)
async def watching(client, broadcasts):
    """These tests exercise the watch, which is off after reset until a scenario turns it on."""
    await monitoring.start_watching(UNIT)
    broadcasts.clear()


async def wait_for(predicate, timeout=3.0, interval=0.05):
    """Poll an async predicate until it returns a truthy value."""
    deadline = asyncio.get_running_loop().time() + timeout
    while True:
        result = await predicate()
        if result:
            return result
        if asyncio.get_running_loop().time() > deadline:
            raise AssertionError("condition not met in time")
        await asyncio.sleep(interval)


async def open_quiet_gap_incident():
    await units.update_unit_state(UNIT, last_water_activity_at=utc_now() - timedelta(seconds=31))
    await monitoring.check_unit(UNIT)
    [incident] = await incidents.list_active_incidents()
    return incident


async def incident_state(incident_id, state):
    incident = await incidents.get_incident(incident_id)
    return incident if incident.state == state else None


def event_types(incident) -> list[str]:
    return [e.type for e in incident.events]


async def post(client, sensor, value):
    return await client.post("/api/readings", json={"unit_id": UNIT, "sensor": sensor, "value": value})


async def test_open_incident(client, broadcasts):
    incident = await open_quiet_gap_incident()

    assert incident.state == "grace"
    assert event_types(incident) == ["detected", "voice_call_started"]
    assert incident.events[0].detail == "Water quiet gap exceeded"
    assert incident.events[1].detail == "Calling Mum (simulated)"
    assert incident.grace_ends_at is not None

    unit = await units.get_unit(UNIT)
    assert unit.status == "unusual_inactivity"
    assert unit.status_reason.startswith("No water use for 0:3")
    assert unit.status_reason.endswith("No door event. Electricity at standby")
    assert unit.active_incident_id == incident.incident_id

    assert await notifications.list_notifications() == []
    assert [t for t, _ in broadcasts] == ["incident.updated", "unit.updated"]
    keys = timers.scheduled_keys()
    assert {f"voice:{incident.incident_id}", f"grace:{incident.incident_id}"} <= keys
    assert f"watch:{UNIT}" not in keys


async def test_grace_ends_then_reminders(client, broadcasts):
    incident = await open_quiet_gap_incident()
    iid = incident.incident_id

    notified = await wait_for(lambda: incident_state(iid, "notified"))
    types = event_types(notified)
    assert types.index("voice_call_no_answer") < types.index("notified")
    assert notified.events[types.index("notified")].detail == "Caregiver and township notified together"
    assert notified.grace_ends_at is None
    assert notified.next_reminder_at is not None

    unit = await units.get_unit(UNIT)
    assert unit.status == "unresolved_concern"
    assert unit.status_reason.endswith("Electricity at standby. Mum did not answer the simulated call.")

    alerts = [n for n in await notifications.list_notifications() if n.kind == "alert"]
    assert sorted(n.role for n in alerts) == ["caregiver", "township"]
    assert alerts[0].message == "Unresolved concern at A-105: Madam Lee Mei Ling could not be reached."
    assert all(n.incident_id == iid for n in alerts)

    async def reminded():
        i = await incidents.get_incident(iid)
        return i if i.reminder_count >= 1 else None

    after = await wait_for(reminded)
    assert after.reminder_count == 1
    assert [e.detail for e in after.events if e.type == "reminder"] == ["Reminder #1"]
    reminders = [n for n in await notifications.list_notifications() if n.kind == "reminder"]
    assert len(reminders) == 2
    assert reminders[0].message == "Reminder #1: concern at A-105 still needs a response."
    assert f"reminder:{iid}" in timers.scheduled_keys()


async def test_voice_no_answer_arrives_before_grace_ends(client):
    incident = await open_quiet_gap_incident()

    async def no_answer():
        i = await incidents.get_incident(incident.incident_id)
        return i if "voice_call_no_answer" in event_types(i) else None

    i = await wait_for(no_answer, timeout=0.9)
    assert i.state == "grace"
    assert i.events[-1].detail == "No answer (simulated)"


async def test_water_during_grace_resolves_silently(client, broadcasts):
    incident = await open_quiet_gap_incident()
    broadcasts.clear()

    r = await post(client, "water", 6)
    assert r.status_code == 201

    resolved = await incidents.get_incident(incident.incident_id)
    assert resolved.state == "auto_resolved"
    assert resolved.outcome == "resident_activity_detected"
    assert resolved.closed_at is not None
    assert resolved.grace_ends_at is None
    assert event_types(resolved)[-2:] == ["voice_call_cancelled", "auto_resolved"]
    assert resolved.events[-1].detail == "Resident activity detected"

    unit = r.json()["unit"]
    assert unit["status"] == "routine"
    assert unit["status_reason"] == "Resolved: water use detected during grace period"
    assert unit["active_incident_id"] is None
    assert unit["quiet_gap"]["last_water_activity_at"] == iso(resolved.closed_at)

    assert await notifications.list_notifications() == []  # no morning reassurance either
    assert [t for t, _ in broadcasts] == ["reading.received", "incident.updated", "unit.updated"]
    keys = timers.scheduled_keys()
    assert f"grace:{incident.incident_id}" not in keys
    assert f"voice:{incident.incident_id}" not in keys
    assert f"watch:{UNIT}" in keys

    await asyncio.sleep(1.2)  # past the old grace deadline: nothing stale fires
    assert (await incidents.get_incident(incident.incident_id)).state == "auto_resolved"
    assert await notifications.list_notifications() == []


async def test_kettle_after_notified_resolves_and_notifies(client, broadcasts):
    incident = await open_quiet_gap_incident()
    await wait_for(lambda: incident_state(incident.incident_id, "notified"))
    broadcasts.clear()

    r = await post(client, "electricity", 1.8)
    unit = r.json()["unit"]
    assert unit["status"] == "routine"
    assert unit["status_reason"] == "Resolved: electricity use (1.8 kW) detected during the check"

    resolved = await incidents.get_incident(incident.incident_id)
    assert resolved.state == "auto_resolved"
    assert resolved.next_reminder_at is None
    assert "voice_call_cancelled" not in event_types(resolved)

    resolved_notes = [n for n in await notifications.list_notifications() if n.kind == "auto_resolved"]
    assert sorted(n.role for n in resolved_notes) == ["caregiver", "township"]
    assert resolved_notes[0].message == "Madam Lee Mei Ling activity detected. Concern resolved."
    assert [t for t, _ in broadcasts] == [
        "reading.received", "incident.updated", "unit.updated", "notification.created", "notification.created",
    ]
    assert f"reminder:{incident.incident_id}" not in timers.scheduled_keys()


async def test_outing_timeout(client):
    door_at = utc_now() - timedelta(seconds=46)
    await units.update_unit_state(
        UNIT, status="possible_away", status_since=door_at, last_door_event_at=door_at, latest_door="closed"
    )
    await monitoring.check_unit(UNIT)
    [incident] = await incidents.list_active_incidents()
    assert incident.events[0].detail == "Outing longer than usual"
    unit = await units.get_unit(UNIT)
    assert unit.status == "unusual_inactivity"
    assert ", then no activity for 0:4" in unit.status_reason
    assert unit.status_reason.endswith("longer than usual outing of 0:45")


async def test_check_unit_twice_opens_one_incident(client):
    await open_quiet_gap_incident()
    await monitoring.check_unit(UNIT)
    await asyncio.gather(monitoring.check_unit(UNIT), monitoring.check_unit(UNIT))
    assert len(await incidents.list_incidents()) == 1


async def test_not_due_opens_nothing_and_rearms(client):
    await monitoring.check_unit(UNIT)  # just reset: 30 s gap not over yet
    assert await incidents.list_incidents() == []
    assert f"watch:{UNIT}" in timers.scheduled_keys()


async def test_reset_during_grace_cancels_timers(client):
    incident = await open_quiet_gap_incident()
    await reset_demo()
    keys = timers.scheduled_keys()
    assert not any(incident.incident_id in k for k in keys)
    assert f"watch:{UNIT}" not in keys  # reset turns the quiet-gap watch off
    await asyncio.sleep(1.3)
    assert await incidents.list_incidents() == []
    assert await notifications.list_notifications() == []


async def test_watch_timer_fires_on_its_own(client, monkeypatch):
    await units.update_unit_state(UNIT, last_water_activity_at=utc_now() - timedelta(seconds=29.7))
    await monitoring.arm_watch(UNIT)
    incident = await wait_for(lambda: _first_active(), timeout=2)
    assert incident.state == "grace"


async def _first_active():
    active = await incidents.list_active_incidents()
    return active[0] if active else None


async def test_restore_reschedules_grace_incident(client):
    now = utc_now()
    incident = await incidents.create_incident(UNIT, now, now + timedelta(seconds=0.5))
    await incidents.add_incident_event(incident.incident_id, "detected", now, detail="Water quiet gap exceeded")
    await units.update_unit_state(UNIT, status="unusual_inactivity", status_reason="No water use", status_since=now)
    await timers.cancel_all()

    await monitoring.restore()
    keys = timers.scheduled_keys()
    assert f"voice:{incident.incident_id}" in keys
    assert f"grace:{incident.incident_id}" in keys
    assert f"watch:{UNIT}" not in keys  # incident active: no watch

    notified = await wait_for(lambda: incident_state(incident.incident_id, "notified"))
    assert "voice_call_no_answer" in event_types(notified)
    assert f"reminder:{incident.incident_id}" in timers.scheduled_keys()


async def test_restore_reschedules_overdue_reminder(client):
    now = utc_now()
    incident = await incidents.create_incident(UNIT, now - timedelta(seconds=60), now - timedelta(seconds=40))
    await incidents.update_incident(
        incident.incident_id, state="notified", grace_ends_at=None, next_reminder_at=now - timedelta(seconds=5)
    )
    await timers.cancel_all()

    await monitoring.restore()

    async def reminded():
        i = await incidents.get_incident(incident.incident_id)
        return i if i.reminder_count == 1 else None

    await wait_for(reminded)


async def test_watch_is_off_after_reset(client):
    await reset_demo()
    await units.update_unit_state(UNIT, last_water_activity_at=utc_now() - timedelta(seconds=300))
    await monitoring.check_unit(UNIT)
    await monitoring.arm_watch(UNIT)
    assert await incidents.list_incidents() == []
    assert f"watch:{UNIT}" not in timers.scheduled_keys()


async def test_reading_does_not_arm_watch_when_off(client):
    await reset_demo()
    await post(client, "water", 6)
    assert f"watch:{UNIT}" not in timers.scheduled_keys()


async def test_start_restarts_the_quiet_gap_clock(client, broadcasts):
    await reset_demo()
    await units.update_unit_state(UNIT, last_water_activity_at=utc_now() - timedelta(seconds=300))
    broadcasts.clear()

    r = await client.post("/api/demo/monitoring", json={"active": True})
    assert r.status_code == 200
    assert r.json() == {"unit_id": UNIT, "active": True}
    unit = await units.get_unit(UNIT)
    assert unit.quiet_gap.last_water_activity_at >= utc_now() - timedelta(seconds=2)
    assert [t for t, _ in broadcasts] == ["unit.updated"]
    assert f"watch:{UNIT}" in timers.scheduled_keys()
    assert await incidents.list_incidents() == []  # the old silence does not count


async def test_stop_cancels_watch_but_keeps_incident_timers(client):
    incident = await open_quiet_gap_incident()

    r = await client.post("/api/demo/monitoring", json={"active": False})
    assert r.json() == {"unit_id": UNIT, "active": False}
    keys = timers.scheduled_keys()
    assert f"watch:{UNIT}" not in keys
    assert f"grace:{incident.incident_id}" in keys

    # A close after the scenario has stopped does not start a new quiet gap.
    await wait_for(lambda: incident_state(incident.incident_id, "notified"))
    await client.post(f"/api/incidents/{incident.incident_id}/acknowledge", json={"role": "township", "name": "Guard Ali"})
    await client.post(
        f"/api/incidents/{incident.incident_id}/close",
        json={"role": "township", "name": "Guard Ali", "outcome": "resident_ok"},
    )
    assert f"watch:{UNIT}" not in timers.scheduled_keys()


async def test_restore_leaves_watch_off(client):
    await reset_demo()
    await monitoring.restore()
    assert f"watch:{UNIT}" not in timers.scheduled_keys()
