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


@pytest.fixture(autouse=True)
async def watching(client, broadcasts):
    """These tests exercise the watch, which is off after reset until a scenario turns it on."""
    await monitoring.start_watching(UNIT)
    broadcasts.clear()


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


async def close(client, iid, actor=ALI, outcome="resident_ok", report="Resident checked; no further help needed."):
    return await client.post(f"/api/incidents/{iid}/close", json={**actor, "outcome": outcome, **({"report": report} if report is not None else {})})


async def test_caregiver_can_confirm_home_only_during_possible_away(client):
    before = await units.get_unit(UNIT)
    assert before is not None
    path = f"/api/units/{UNIT}/confirm-home"
    body = {"role": "caregiver", "name": before.caregiver_name}
    assert (await client.post(path, json=body)).status_code == 409
    await units.update_unit_state(UNIT, status="possible_away", status_since=utc_now())
    assert (await client.post(path, json={"role": "caregiver", "name": "Someone else"})).status_code == 409
    response = await client.post(path, json=body)
    assert response.status_code == 200
    confirmed = response.json()
    assert confirmed["status"] == "routine"
    assert (await units.get_unit(UNIT)).quiet_gap.last_water_activity_at == before.quiet_gap.last_water_activity_at
    assert confirmed["quiet_gap"]["last_caregiver_confirmation_at"] is not None
    assert "sensor activity has not been confirmed" in confirmed["status_reason"]
    assert (await client.post(path, json=body)).status_code == 409


def away_body(name, start=-60, end=3600, reason="Staying with my sister"):
    now = utc_now()
    return {"role": "caregiver", "name": name, "reason": reason,
            "starts_at": (now + timedelta(seconds=start)).isoformat(), "ends_at": (now + timedelta(seconds=end)).isoformat()}


async def test_away_period_pauses_quiet_gap_alert(client):
    unit = await units.get_unit(UNIT)
    response = await client.post(f"/api/units/{UNIT}/away-periods", json=away_body(unit.caregiver_name))
    assert response.status_code == 200
    [period] = response.json()["away_periods"]
    # The reason is private: never in Unit (which township receives), only in the caregiver read.
    assert "reason" not in period
    path = f"/api/units/{UNIT}/away-periods"
    assert (await client.get(path, params={"role": "township"})).status_code == 403
    [detail] = (await client.get(path, params={"role": "caregiver"})).json()
    assert detail["reason"] == "Staying with my sister"
    # Silence well past the usual gap opens nothing while the resident is away.
    await units.update_unit_state(UNIT, last_water_activity_at=utc_now() - timedelta(seconds=120))
    await monitoring.check_unit(UNIT)
    assert await incidents.list_active_incidents() == []
    # Ending it restarts the clock now rather than counting the whole trip as silence.
    response = await client.post(f"/api/units/{UNIT}/away-periods/{period['period_id']}/cancel",
                                 json={"role": "caregiver", "name": unit.caregiver_name})
    assert response.status_code == 200
    assert response.json()["away_periods"] == []
    await monitoring.check_unit(UNIT)
    assert await incidents.list_active_incidents() == []


async def test_unresolved_incident_blocks_tracking_pause(client):
    iid = await open_incident()
    unit = await units.get_unit(UNIT)
    path = f"/api/units/{UNIT}/away-periods"
    response = await client.post(path, json=away_body(unit.caregiver_name))
    assert response.status_code == 409
    assert "outcome" in response.json()["detail"]
    assert (await units.get_unit(UNIT)).away_periods == []
    assert (await incidents.get_incident(iid)).state == "grace"


async def test_away_period_validation(client):
    name = (await units.get_unit(UNIT)).caregiver_name
    path = f"/api/units/{UNIT}/away-periods"
    assert (await client.post(path, json=away_body("Someone else"))).status_code == 409
    assert (await client.post(path, json=away_body(name, start=60, end=30))).status_code == 422
    assert (await client.post(path, json=away_body(name, start=-120, end=-60))).status_code == 422
    assert (await client.post(path, json=away_body(name, end=3600 * 24 * 91))).status_code == 422
    # The reason is optional; a blank one is stored as none.
    assert (await client.post(path, json=away_body(name, reason="   "))).status_code == 200
    [detail] = (await client.get(path, params={"role": "caregiver"})).json()
    assert detail["reason"] is None
    assert (await client.post(path, json=away_body(name, start=600, end=7200))).status_code == 409
    upcoming = await client.post(path, json=away_body(name, start=7200, end=9000))
    assert upcoming.status_code == 200
    later = upcoming.json()["away_periods"][-1]
    cancel = f"{path}/{later['period_id']}/cancel"
    assert (await client.post(cancel, json={"role": "caregiver", "name": name})).status_code == 200
    assert (await client.post(cancel, json={"role": "caregiver", "name": name})).status_code == 409
    assert (await client.post(f"{path}/nope/cancel", json={"role": "caregiver", "name": name})).status_code == 404


async def test_activity_while_away_notifies_caregiver_once(client):
    name = (await units.get_unit(UNIT)).caregiver_name
    assert (await client.post(f"/api/units/{UNIT}/away-periods", json=away_body(name))).status_code == 200
    for value in ("open", "closed", "open"):
        assert (await client.post("/api/readings", json={"unit_id": UNIT, "sensor": "door", "value": value})).status_code == 200
    [note] = await notes("away_activity")
    assert note.role == "caregiver"
    assert "while" in note.message and "is marked away" in note.message
    assert await notes("morning_reassurance") == []


async def away_notice(client, name):
    assert (await client.post(f"/api/units/{UNIT}/away-periods", json=away_body(name))).status_code == 200
    assert (await client.post("/api/readings", json={"unit_id": UNIT, "sensor": "door", "value": "open"})).status_code == 200
    [note] = await notes("away_activity")
    return f"/api/notifications/{note.notification_id}/away-response"


async def test_away_activity_known_visitor_only_records_answer(client):
    name = (await units.get_unit(UNIT)).caregiver_name
    path = await away_notice(client, name)
    assert (await client.post(path, json={"role": "caregiver", "name": "Someone else", "response": "known_visitor"})).status_code == 409
    response = await client.post(path, json={"role": "caregiver", "name": name, "response": "known_visitor"})
    assert response.status_code == 200
    assert response.json()["response"] == "known_visitor"
    assert response.json()["incident_id"] is None
    assert await incidents.list_active_incidents() == []
    assert (await units.get_unit(UNIT)).away_periods != []
    # One answer per notice.
    assert (await client.post(path, json={"role": "caregiver", "name": name, "response": "resident_returned"})).status_code == 409
    assert (await client.post("/api/notifications/nope/away-response",
                              json={"role": "caregiver", "name": name, "response": "known_visitor"})).status_code == 404


async def test_away_activity_resident_returned_ends_period(client):
    name = (await units.get_unit(UNIT)).caregiver_name
    path = await away_notice(client, name)
    response = await client.post(path, json={"role": "caregiver", "name": name, "response": "resident_returned"})
    assert response.status_code == 200
    assert (await units.get_unit(UNIT)).away_periods == []


async def test_away_activity_home_check_goes_to_township(client):
    name = (await units.get_unit(UNIT)).caregiver_name
    path = await away_notice(client, name)
    response = await client.post(path, json={"role": "caregiver", "name": name, "response": "home_check_requested"})
    assert response.status_code == 200
    iid = response.json()["incident_id"]
    incident = await incidents.get_incident(iid)
    assert incident.state == "notified"
    assert [e.type for e in incident.events] == ["detected", "township_requested", "notified"]
    assert (await units.get_unit(UNIT)).status == "unresolved_concern"
    [request] = await notes("township_requested")
    assert request.role == "township" and request.incident_id == iid
    # More activity at home must not close a check the caregiver asked for.
    assert (await client.post("/api/readings", json={"unit_id": UNIT, "sensor": "water", "value": 6})).status_code == 200
    assert (await incidents.get_incident(iid)).state == "notified"
    assert (await ack(client, iid)).status_code == 200
    # A home check records what was found at the home, not the resident's condition.
    assert (await close(client, iid, outcome="resident_ok")).status_code == 409
    assert (await close(client, iid, outcome="known_person_home", report="Daughter collecting post.")).status_code == 200
    assert (await units.get_unit(UNIT)).away_periods != []
    assert (await units.get_unit(UNIT)).status == "routine"


async def test_caregiver_coordination_does_not_claim_visit(client):
    iid = await notified_incident()
    assert (await ack(client, iid, {"role": "caregiver", "name": "Sarah Lee"})).status_code == 409
    path = f"/api/incidents/{iid}/caregiver-response"
    for action in ("caregiver_checking_in", "township_requested"):
        response = await client.post(path, json={"role": "caregiver", "name": "Sarah Lee", "action": action})
        assert response.status_code == 200
        assert response.json()["state"] == "notified"
        assert response.json()["acknowledged_by"] is None
        assert response.json()["next_reminder_at"] is not None
        assert response.json()["events"][-1]["type"] == action
        assert sorted(n.role for n in await notes(action)) == ["caregiver", "township"]
        assert (await client.post(path, json={"role": "caregiver", "name": "Sarah Lee", "action": action})).status_code == 409
    assert (await client.post(path, json={"role": "township", "name": "Guard Ali", "action": "township_requested"})).status_code == 422
    response = await ack(client, iid)
    assert response.status_code == 200
    assert response.json()["acknowledged_by"]["name"] == "Guard Ali"


async def test_caregiver_direct_confirmation_closes_only_before_visit(client):
    iid = await notified_incident()
    path = f"/api/incidents/{iid}/caregiver-response"
    safe = {"role": "caregiver", "name": "Sarah Lee", "action": "resident_confirmed_safe"}
    assert (await client.post(path, json=safe)).status_code == 409
    await client.post(path, json={**safe, "action": "caregiver_checking_in"})
    closed = await client.post(path, json=safe)
    assert closed.status_code == 200
    assert closed.json()["state"] == "closed"
    assert closed.json()["outcome"] == "resident_ok"
    assert closed.json()["events"][-1]["actor"]["role"] == "caregiver"
    assert (await client.post(path, json=safe)).status_code == 409

    second = await notified_incident()
    second_path = f"/api/incidents/{second}/caregiver-response"
    await client.post(second_path, json={**safe, "action": "caregiver_checking_in"})
    await ack(client, second)
    assert (await client.post(second_path, json=safe)).status_code == 409


async def test_emergency_handoff_requires_acknowledger_and_stays_open(client):
    iid = await notified_incident()
    path = f"/api/incidents/{iid}/escalate"
    assert (await client.post(path, json={**ALI, "action": "emergency_called"})).status_code == 409
    assert (await ack(client, iid)).status_code == 200
    assert (await client.post(path, json={"role": "caregiver", "name": "Sarah Lee", "action": "emergency_called"})).status_code == 403

    unverified = await client.post(path, json={**ALI, "action": "unable_to_verify"})
    assert unverified.status_code == 200
    assert unverified.json()["state"] == "acknowledged"
    assert (await close(client, iid, outcome="assistance_provided")).status_code == 409

    called = await client.post(path, json={**ALI, "action": "emergency_called"})
    assert called.status_code == 200
    assert called.json()["state"] == "acknowledged"
    assert called.json()["events"][-1]["type"] == "emergency_called"
    assert (await client.post(path, json={**ALI, "action": "emergency_called"})).status_code == 409
    assert sorted(n.role for n in await notes("emergency_called")) == ["caregiver", "township"]
    reading = await client.post("/api/readings", json={"unit_id": UNIT, "sensor": "water", "value": 1.0})
    assert reading.status_code == 200
    assert (await incidents.get_incident(iid)).state == "acknowledged"
    assert (await close(client, iid, outcome="assistance_provided", report="999 contacted; resident handed to ambulance crew.")).status_code == 200


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
    assert r.status_code == 409
    assert r.json()["detail"] == "Incident is not awaiting a township response"
    assert (await incidents.get_incident(iid)).state == "grace"

    async def is_notified():
        return (await incidents.get_incident(iid)).state == "notified"

    await wait_for(is_notified)
    assert (await units.get_unit(UNIT)).status == "unresolved_concern"
    assert len(await notes("alert")) == 2
    assert (await incidents.get_incident(iid)).state == "notified"


async def test_second_acknowledge_is_409(client):
    iid = await notified_incident()
    assert (await ack(client, iid)).status_code == 200
    r = await ack(client, iid, {"role": "caregiver", "name": "Sarah Lee"})
    assert r.status_code == 409
    assert r.json()["detail"] == "Incident is not awaiting a township response"


async def test_simultaneous_acknowledges(client):
    iid = await notified_incident()
    results = await asyncio.gather(
        ack(client, iid), ack(client, iid, {"role": "caregiver", "name": "Sarah Lee"})
    )
    assert sorted(r.status_code for r in results) == [200, 409]
    assert len(await notes("acknowledged")) == 2  # one per role, from the winner only


async def test_close_errors(client):
    iid = await notified_incident()
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


async def test_township_report_is_saved_with_outcome(client):
    iid = await notified_incident()
    await ack(client, iid)
    response = await close(client, iid, report="Resident answered. No assistance required.")
    assert response.status_code == 200
    assert response.json()["report"] == "Resident answered. No assistance required."
    saved = await incidents.get_incident(iid)
    assert saved.report == "Resident answered. No assistance required."


@pytest.mark.parametrize(
    ("outcome", "label"),
    [("assistance_provided", "Assistance provided"), ("sent_to_hospital", "Sent to hospital"), ("resident_away", "Resident was away")],
)
async def test_close_outcome_labels(client, outcome, label):
    iid = await notified_incident()
    await ack(client, iid)
    r = await close(client, iid, outcome=outcome)
    assert r.json()["events"][-1]["detail"] == label
    assert (await units.get_unit(UNIT)).status_reason == f"Incident closed by Guard Ali: {label}"


async def test_close_validation(client):
    iid = await notified_incident()
    await ack(client, iid)
    r = await close(client, iid, outcome="resident_activity_detected")
    assert r.status_code == 422
    r = await client.post(f"/api/incidents/{iid}/acknowledge", json={"role": "township", "name": ""})
    assert r.status_code == 422


async def test_activity_while_acknowledged_auto_resolves(client):
    iid = await notified_incident()
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


async def test_home_check_resident_returned_ends_away_period(client):
    name = (await units.get_unit(UNIT)).caregiver_name
    path = await away_notice(client, name)
    iid = (await client.post(path, json={"role": "caregiver", "name": name, "response": "home_check_requested"})).json()["incident_id"]
    assert (await ack(client, iid)).status_code == 200
    assert (await close(client, iid, outcome="resident_returned", report="Resident came back early.")).status_code == 200
    assert (await units.get_unit(UNIT)).away_periods == []


async def test_home_check_outcomes_only_for_home_checks(client):
    iid = await notified_incident()
    assert (await ack(client, iid)).status_code == 200
    assert (await close(client, iid, outcome="home_secure")).status_code == 409


async def test_hospital_transfer_persists_until_caregiver_confirms_return(client):
    iid = await notified_incident()
    await ack(client, iid)
    assert (await close(client, iid, outcome="sent_to_hospital")).status_code == 200
    unit = await units.get_unit(UNIT)
    assert unit.care_state == "in_hospital"
    assert unit.active_incident_id is None
    await units.update_unit_state(UNIT, last_water_activity_at=utc_now() - timedelta(days=3))
    await monitoring.check_unit(UNIT)
    assert await incidents.list_active_incidents() == []
    morning_before = len(await notes("morning_reassurance"))
    await client.post("/api/readings", json={"unit_id": UNIT, "sensor": "water", "value": 1})
    assert (await units.get_unit(UNIT)).care_state == "in_hospital"
    assert len(await notes("morning_reassurance")) == morning_before
    path = f"/api/units/{UNIT}/confirm-home"
    assert (await client.post(path, json={"role": "caregiver", "name": "Someone else"})).status_code == 409
    response = await client.post(path, json={"role": "caregiver", "name": unit.caregiver_name})
    assert response.status_code == 200
    assert response.json()["care_state"] == "home_monitoring"
    assert response.json()["quiet_gap"]["last_caregiver_confirmation_at"] is not None
    assert (await client.post(path, json={"role": "caregiver", "name": unit.caregiver_name})).status_code == 409
