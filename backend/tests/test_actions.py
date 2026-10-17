"""Acknowledge and close tests against a real Postgres (TEST_DATABASE_URL)."""

import asyncio
import os
from datetime import timedelta

import pytest

from app import timers
from app.db import incidents, notifications, units
from app.services import monitoring
from app.settings import settings
from app.timeutil import utc_now

pytestmark = pytest.mark.skipif(
    not os.environ.get("TEST_DATABASE_URL"),
    reason="set TEST_DATABASE_URL to a separate Postgres to run database tests (never the demo database)",
)

UNIT = "A-105"
ALI = {"role": "township", "name": "Guard Ali"}


@pytest.fixture(autouse=True)
def fast_timers(monkeypatch):
    monkeypatch.setattr(settings, "grace_period_seconds", 1)
    monkeypatch.setattr(settings, "reminder_interval_seconds", 1)
    monkeypatch.setattr(settings, "voice_call_ring_seconds", 0.2)


async def wait_for(predicate, timeout=3.0, interval=0.05):
    deadline = asyncio.get_running_loop().time() + timeout
    while True:
        result = await predicate()
        if result:
            return result
        if asyncio.get_running_loop().time() > deadline:
            raise AssertionError("condition not met in time")
        await asyncio.sleep(interval)


async def open_incident() -> str:
    await units.update_unit_state(UNIT, last_water_activity_at=utc_now() - timedelta(seconds=31))
    await monitoring.check_unit(UNIT)
    [incident] = await incidents.list_active_incidents()
    return incident.incident_id


async def notified_incident() -> str:
    iid = await open_incident()

    async def is_notified():
        return (await incidents.get_incident(iid)).state == "notified"

    await wait_for(is_notified)
    return iid


async def notes(kind):
    return [n for n in await notifications.list_notifications() if n.kind == kind]


async def ack(client, iid, actor=ALI):
    return await client.post(f"/api/incidents/{iid}/acknowledge", json=actor)


async def close(client, iid, actor=ALI, outcome="resident_ok"):
    return await client.post(f"/api/incidents/{iid}/close", json={**actor, "outcome": outcome})


async def test_acknowledge_from_notified_stops_reminders(client, broadcasts):
    iid = await notified_incident()
    broadcasts.clear()

    r = await ack(client, iid)
    assert r.status_code == 200
    body = r.json()
    assert body["state"] == "acknowledged"
    assert body["acknowledged_by"]["role"] == "township"
    assert body["acknowledged_by"]["name"] == "Guard Ali"
    assert body["acknowledged_by"]["at"].endswith("Z")
    assert body["next_reminder_at"] is None
    assert body["events"][-1] == {"type": "acknowledged", "at": body["acknowledged_by"]["at"], "actor": ALI}
    assert "voice_call_cancelled" not in [e["type"] for e in body["events"]]

    acks = await notes("acknowledged")
    assert sorted(n.role for n in acks) == ["caregiver", "township"]
    assert acks[0].message == "Guard Ali is checking now."
    assert [t for t, _ in broadcasts] == ["incident.updated", "notification.created", "notification.created"]
    assert (await units.get_unit(UNIT)).status == "unresolved_concern"

    reminders_before = len(await notes("reminder"))
    await asyncio.sleep(1.3)
    assert len(await notes("reminder")) == reminders_before
    assert not any(iid in k for k in timers.scheduled_keys())


async def test_acknowledge_during_grace(client):
    iid = await open_incident()
    r = await ack(client, iid)
    assert r.status_code == 200
    types = [e["type"] for e in r.json()["events"]]
    assert types == ["detected", "voice_call_started", "voice_call_cancelled", "acknowledged"]
    assert r.json()["grace_ends_at"] is None
    assert f"grace:{iid}" not in timers.scheduled_keys()

    await asyncio.sleep(1.3)
    assert (await units.get_unit(UNIT)).status == "unusual_inactivity"
    assert await notes("alert") == []
    assert (await incidents.get_incident(iid)).state == "acknowledged"


async def test_second_acknowledge_is_409(client):
    iid = await open_incident()
    assert (await ack(client, iid)).status_code == 200
    r = await ack(client, iid, {"role": "caregiver", "name": "Sarah Lee"})
    assert r.status_code == 409
    assert r.json()["detail"] == "Incident already acknowledged or closed"


async def test_simultaneous_acknowledges(client):
    iid = await open_incident()
    results = await asyncio.gather(
        ack(client, iid), ack(client, iid, {"role": "caregiver", "name": "Sarah Lee"})
    )
    assert sorted(r.status_code for r in results) == [200, 409]
    assert len(await notes("acknowledged")) == 2  # one per role, from the winner only


async def test_close_errors(client):
    iid = await open_incident()
    r = await close(client, iid)
    assert r.status_code == 409
    assert r.json()["detail"] == "Incident must be acknowledged first"

    await ack(client, iid)
    r = await close(client, iid, {"role": "caregiver", "name": "Guard Ali"})
    assert r.status_code == 403
    assert r.json()["detail"] == "Only the acknowledger can close this incident"
    assert (await close(client, iid, {"role": "township", "name": "Guard Bob"})).status_code == 403

    assert (await close(client, iid)).status_code == 200
    assert (await close(client, iid)).status_code == 409


async def test_successful_close(client, broadcasts):
    iid = await notified_incident()
    await ack(client, iid)
    broadcasts.clear()

    r = await close(client, iid, outcome="resident_ok")
    assert r.status_code == 200
    body = r.json()
    assert body["state"] == "closed"
    assert body["outcome"] == "resident_ok"
    assert body["closed_at"].endswith("Z")
    assert body["events"][-1] == {"type": "closed", "at": body["closed_at"], "actor": ALI, "detail": "Resident OK"}

    unit = await units.get_unit(UNIT)
    assert unit.status == "routine"
    assert unit.status_reason == "Incident closed by Guard Ali: Resident OK"
    assert unit.active_incident_id is None
    assert unit.quiet_gap.last_water_activity_at >= utc_now() - timedelta(seconds=2)

    closed_notes = await notes("closed")
    assert sorted(n.role for n in closed_notes) == ["caregiver", "township"]
    assert closed_notes[0].message == "Incident closed: Resident OK."
    assert [t for t, _ in broadcasts] == [
        "incident.updated", "unit.updated", "notification.created", "notification.created",
    ]
    assert f"watch:{UNIT}" in timers.scheduled_keys()

    listed = (await client.get(f"/api/units/{UNIT}/incidents", params={"state": "closed"})).json()
    assert [i["incident_id"] for i in listed] == [iid]


@pytest.mark.parametrize(
    ("outcome", "label"),
    [("assistance_provided", "Assistance provided"), ("resident_away", "Resident was away")],
)
async def test_close_outcome_labels(client, outcome, label):
    iid = await open_incident()
    await ack(client, iid)
    r = await close(client, iid, outcome=outcome)
    assert r.json()["events"][-1]["detail"] == label
    assert (await units.get_unit(UNIT)).status_reason == f"Incident closed by Guard Ali: {label}"


async def test_close_validation(client):
    iid = await open_incident()
    await ack(client, iid)
    r = await close(client, iid, outcome="resident_activity_detected")
    assert r.status_code == 422
    r = await client.post(f"/api/incidents/{iid}/acknowledge", json={"role": "township", "name": ""})
    assert r.status_code == 422


async def test_activity_while_acknowledged_auto_resolves(client):
    iid = await open_incident()
    await ack(client, iid)
    r = await client.post("/api/readings", json={"unit_id": UNIT, "sensor": "water", "value": 6})
    assert r.json()["unit"]["status"] == "routine"
    assert (await incidents.get_incident(iid)).state == "auto_resolved"
    assert len(await notes("auto_resolved")) == 2
    assert (await close(client, iid)).status_code == 409


async def test_unknown_incident_is_404(client):
    missing = "00000000-0000-0000-0000-000000000000"
    assert (await ack(client, missing)).status_code == 404
    assert (await close(client, missing)).status_code == 404
