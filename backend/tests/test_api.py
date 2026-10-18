"""API and data-access tests against a real Postgres (TEST_DATABASE_URL). Each test starts from
a fresh demo reset."""

import asyncio
import os
from datetime import timedelta

import pytest
from pydantic import TypeAdapter

from app.db import NotFoundError, incidents, notifications, pool, readings, units
from app.models import (
    BuddyMatch,
    CommunityActivity,
    CompanionMessage,
    Config,
    Incident,
    MessagePreset,
    Notification,
    Reading,
    Snapshot,
    Unit,
)
from app.settings import settings
from app.timeutil import iso, local_hhmm, utc_now

pytestmark = pytest.mark.skipif(
    not os.environ.get("TEST_DATABASE_URL"),
    reason="set TEST_DATABASE_URL to a separate Postgres to run database tests (never the demo database)",
)


def parse(model, data):
    return TypeAdapter(model).validate_python(data)


async def add_incident_with_reading():
    now = utc_now()
    await readings.insert_reading(Reading(unit_id="A-105", sensor="water", value=6.0, recorded_at=now))
    incident = await incidents.create_incident("A-105", now, now + timedelta(seconds=15))
    await incidents.add_incident_event(incident.incident_id, "detected", now)
    return incident


# 1 -----------------------------------------------------------------------------------------


async def test_reset_returns_seeded_units(client):
    r = await client.post("/api/demo/reset")
    assert r.status_code == 200
    got = parse(list[Unit], r.json()["units"])
    assert [u.unit_id for u in got] == ["A-101", "A-102", "A-103", "A-104", "A-105", "A-106"]

    a105 = r.json()["units"][4]
    assert a105["controllable"] is True and a105["status"] == "routine"
    assert a105["quiet_gap"]["last_water_activity_at"] == a105["status_since"]
    assert a105["active_incident_id"] is None
    assert a105["status_since"].endswith("Z")

    a102 = next(u for u in got if u.unit_id == "A-102")
    assert a102.status == "possible_away"
    assert f"Door opened at {local_hhmm(a102.latest.last_door_event_at)}," in a102.status_reason
    assert [u.unit_id for u in got if u.controllable] == ["A-105"]


async def test_reset_with_invalid_seed_returns_500_and_keeps_data(client, tmp_path, monkeypatch):
    await add_incident_with_reading()
    bad = tmp_path / "seed.json"
    bad.write_text('{"version": 1}')
    monkeypatch.setattr(settings, "seed_file", bad)

    r = await client.post("/api/demo/reset")
    assert r.status_code == 500 and "invalid seed file" in r.json()["detail"]
    assert len(await units.list_units()) == 6
    assert len(await incidents.list_incidents()) == 1


# 2 -----------------------------------------------------------------------------------------


async def test_every_get_returns_contract_shape(client):
    incident = await add_incident_with_reading()
    await notifications.insert_notification("caregiver", "A-105", "alert", "Alert", incident.incident_id)

    cases = [
        ("/api/config", None, Config),
        ("/api/units", None, list[Unit]),
        ("/api/units/A-105", None, Unit),
        ("/api/units/A-105/readings", None, list[Reading]),
        ("/api/units/A-105/incidents", {"state": "grace"}, list[Incident]),
        (f"/api/incidents/{incident.incident_id}", None, Incident),
        ("/api/notifications", {"role": "caregiver"}, list[Notification]),
        ("/api/community/activities", {"unit_id": "A-105"}, list[CommunityActivity]),
        ("/api/companion/messages", {"unit_id": "A-105"}, list[CompanionMessage]),
        ("/api/companion/message-presets", None, list[MessagePreset]),
        ("/api/companion/buddy", {"unit_id": "A-105"}, BuddyMatch | None),
    ]
    for path, params, model in cases:
        r = await client.get(path, params=params)
        assert r.status_code == 200, path
        parse(model, r.json())

    assert (await client.get("/api/config")).json() == {
        "grace_period_seconds": settings.grace_period_seconds,
        "reminder_interval_seconds": settings.reminder_interval_seconds,
    }
    assert len((await client.get("/api/units/A-105/readings")).json()) == 1
    assert (await client.get("/api/units/A-105")).json()["active_incident_id"] == incident.incident_id
    assert [a["activity_id"] for a in (await client.get("/api/community/activities")).json()] != []


@pytest.mark.parametrize(
    "path,params",
    [
        ("/api/units/Z-999", None),
        ("/api/units/Z-999/readings", None),
        ("/api/units/Z-999/incidents", None),
        ("/api/incidents/nope", None),
        ("/api/community/activities", {"unit_id": "Z-999"}),
        ("/api/companion/messages", {"unit_id": "Z-999"}),
        ("/api/companion/buddy", {"unit_id": "Z-999"}),
        ("/api/companion/neighbours", {"unit_id": "Z-999"}),
    ],
)
async def test_unknown_ids_return_404(client, path, params):
    assert (await client.get(path, params=params)).status_code == 404


@pytest.mark.parametrize(
    "path,params",
    [
        ("/api/notifications", None),
        ("/api/notifications", {"role": "admin"}),
        ("/api/units/A-105/readings", {"since": "yesterday"}),
        ("/api/units/A-105/readings", {"since": "2026-10-15T08:00:00"}),  # no time zone
        ("/api/units/A-105/incidents", {"state": "bogus"}),
        ("/api/companion/messages", None),
    ],
)
async def test_bad_query_returns_422(client, path, params):
    assert (await client.get(path, params=params)).status_code == 422


async def test_readings_since_filter(client):
    now = utc_now()
    for seconds, value in [(-10, 6.0), (0, 0.0)]:
        await readings.insert_reading(
            Reading(unit_id="A-105", sensor="water", value=value, recorded_at=now + timedelta(seconds=seconds))
        )
    r = await client.get("/api/units/A-105/readings", params={"since": iso(now - timedelta(seconds=1))})
    assert [x["value"] for x in r.json()] == [0.0]
    r = await client.get("/api/units/A-105/readings")
    assert [x["value"] for x in r.json()] == [6.0, 0.0]  # oldest first


async def test_incident_state_filter_is_literal(client):
    now = utc_now()
    closed = await incidents.create_incident("A-105", now - timedelta(minutes=2), now)
    await incidents.update_incident(closed.incident_id, state="closed", outcome="resident_ok", closed_at=now)
    auto = await incidents.create_incident("A-105", now - timedelta(minutes=1), now)
    await incidents.update_incident(auto.incident_id, state="auto_resolved", closed_at=now)

    r = await client.get("/api/units/A-105/incidents", params={"state": "closed"})
    assert [i["incident_id"] for i in r.json()] == [closed.incident_id]
    r = await client.get("/api/units/A-105/incidents")
    assert [i["incident_id"] for i in r.json()] == [auto.incident_id, closed.incident_id]  # newest first


# 3 -----------------------------------------------------------------------------------------


async def test_send_message_delivers_notifies_and_broadcasts(client, broadcasts):
    before = (await client.get("/api/units/A-105")).json()
    body = {"unit_id": "A-105", "from_name": "Sarah Lee", "preset_id": "p1"}
    r = await client.post("/api/companion/messages", json=body)

    assert r.status_code == 201
    message = parse(CompanionMessage, r.json())
    assert (message.text, message.channel, message.simulated, message.status) == (
        "Thinking of you, Mum", "voice_call", True, "delivered",
    )  # fmt: skip

    feed = (await client.get("/api/notifications", params={"role": "caregiver"})).json()
    assert [(n["kind"], n["message"]) for n in feed] == [
        ("message_delivered", 'Delivered to Mum by voice call: "Thinking of you, Mum"')
    ]
    assert (await client.get("/api/notifications", params={"role": "township"})).json() == []
    assert [t for t, _ in broadcasts] == ["notification.created", "companion.message_delivered"]
    assert broadcasts[1][1].model_dump(mode="json") == r.json()

    # Answering the phone is not activity for the status rules.
    after = (await client.get("/api/units/A-105")).json()
    assert {k: after[k] for k in ("status", "status_since", "quiet_gap")} == {
        k: before[k] for k in ("status", "status_since", "quiet_gap")
    }
    assert len((await client.get("/api/companion/messages", params={"unit_id": "A-105"})).json()) == 1


async def test_send_message_errors(client, broadcasts):
    r = await client.post("/api/companion/messages", json={"unit_id": "A-105", "from_name": "Sarah Lee", "preset_id": "p9"})
    assert r.status_code == 404 and r.json() == {"detail": "Preset not found"}
    r = await client.post("/api/companion/messages", json={"unit_id": "Z-999", "from_name": "Sarah Lee", "preset_id": "p1"})
    assert r.status_code == 404
    assert broadcasts == []


# 4 -----------------------------------------------------------------------------------------


async def test_buddy_request_matches_once_and_reset_clears(client):
    r = await client.post("/api/companion/buddy/request", json={"unit_id": "A-105"})
    assert r.status_code == 201
    match = parse(BuddyMatch, r.json())
    assert (match.buddy.name, match.shared_interest, match.next_activity.activity_id) == ("Auntie Mei", "gardening", "c1")
    assert r.json()["simulated"] is True

    feed = (await client.get("/api/notifications", params={"role": "caregiver"})).json()
    assert feed[0]["kind"] == "buddy_matched"
    assert feed[0]["message"] == "Mum is matched with Auntie Mei, who also enjoys gardening"

    again = await client.post("/api/companion/buddy/request", json={"unit_id": "A-105"})
    assert again.status_code == 409 and again.json() == {"detail": "Already matched"}
    assert (await client.get("/api/companion/buddy", params={"unit_id": "A-105"})).json() == r.json()

    await client.post("/api/demo/reset")
    got = await client.get("/api/companion/buddy", params={"unit_id": "A-105"})
    assert got.status_code == 200 and got.json() is None


async def test_neighbour_flow_consent_introduce_withdraw(client):
    url = "/api/companion/neighbours"
    start = (await client.get(url, params={"unit_id": "A-105"})).json()
    assert start == {"unit_id": "A-105", "opted_in": False, "match": None, "introduction_requested_at": None}

    early = await client.post(f"{url}/introduce", json={"unit_id": "A-105"})
    assert early.status_code == 409

    r = await client.post(f"{url}/consent", json={"unit_id": "A-105", "open": True})
    assert r.status_code == 200
    match = r.json()["match"]
    assert (match["name"], match["floor"], match["labels"]) == (
        "Madam Wong Siew Lan", 1, ["early risers", "morning outings"],
    )  # fmt: skip
    assert match["meeting_activity"]["activity_id"] == "c2"
    assert match["simulated"] is True
    # Privacy: no times and no unit_id of the neighbour, ever.
    for leaked in ("05:45", "06:50", "07:00", "08:00", "A-104"):
        assert leaked not in r.text

    intro = await client.post(f"{url}/introduce", json={"unit_id": "A-105"})
    assert intro.status_code == 201 and intro.json()["introduction_requested_at"]
    caregiver = (await client.get("/api/notifications", params={"role": "caregiver"})).json()
    assert caregiver[0]["kind"] == "neighbour_introduced"
    assert caregiver[0]["message"] == (
        "Introduction requested. The community coordinator will arrange for Mum to meet Madam Wong Siew Lan."
    )
    township = (await client.get("/api/notifications", params={"role": "township"})).json()
    assert all(n["kind"] != "neighbour_introduced" for n in township)

    again = await client.post(f"{url}/introduce", json={"unit_id": "A-105"})
    assert again.status_code == 409

    gone = (await client.post(f"{url}/consent", json={"unit_id": "A-105", "open": False})).json()
    assert gone == {"unit_id": "A-105", "opted_in": False, "match": None, "introduction_requested_at": None}


async def test_neighbour_withdrawal_removes_them_from_others(client):
    url = "/api/companion/neighbours"
    await client.post(f"{url}/consent", json={"unit_id": "A-105", "open": True})
    await client.post(f"{url}/consent", json={"unit_id": "A-104", "open": False})
    match = (await client.get(url, params={"unit_id": "A-105"})).json()["match"]
    assert match["name"] == "Puan Aminah binti Yusof"


async def test_neighbour_reset_clears_consent_and_introductions(client):
    url = "/api/companion/neighbours"
    await client.post(f"{url}/consent", json={"unit_id": "A-105", "open": True})
    await client.post(f"{url}/introduce", json={"unit_id": "A-105"})
    await client.post("/api/demo/reset")
    state = (await client.get(url, params={"unit_id": "A-105"})).json()
    assert state["opted_in"] is False and state["introduction_requested_at"] is None


async def test_neighbour_no_match_is_404(client):
    url = "/api/companion/neighbours"
    r = await client.post(f"{url}/consent", json={"unit_id": "A-106", "open": True})
    assert r.json()["opted_in"] is True and r.json()["match"] is None
    assert (await client.post(f"{url}/introduce", json={"unit_id": "A-106"})).status_code == 404


async def test_simultaneous_buddy_requests_match_once(client):
    responses = await asyncio.gather(
        *[client.post("/api/companion/buddy/request", json={"unit_id": "A-101"}) for _ in range(5)]
    )
    assert sorted(r.status_code for r in responses) == [201, 409, 409, 409, 409]
    kinds = [n["kind"] for n in (await client.get("/api/notifications", params={"role": "caregiver"})).json()]
    assert kinds == ["buddy_matched"]


async def test_buddy_request_errors(client):
    assert (await client.post("/api/companion/buddy/request", json={"unit_id": "Z-999"})).status_code == 404
    async with pool.get_pool().acquire() as c:
        await c.execute("delete from resident_interests where unit_id = 'A-106'")
    r = await client.post("/api/companion/buddy/request", json={"unit_id": "A-106"})
    assert r.status_code == 404 and r.json() == {"detail": "No buddy shares an interest"}


# 5 -----------------------------------------------------------------------------------------


async def test_mark_read_only_affects_that_role(client):
    for role in ("caregiver", "caregiver", "township"):
        await notifications.insert_notification(role, "A-105", "alert", "Alert")

    r = await client.post("/api/notifications/read", json={"role": "caregiver"})
    assert r.status_code == 204 and r.content == b""
    caregiver = (await client.get("/api/notifications", params={"role": "caregiver"})).json()
    township = (await client.get("/api/notifications", params={"role": "township"})).json()
    assert [n["read"] for n in caregiver] == [True, True]
    assert [n["read"] for n in township] == [False]


async def test_opening_one_caregiver_update_persists_only_that_update(client, broadcasts):
    first = await notifications.insert_notification("caregiver", "A-105", "alert", "First")
    second = await notifications.insert_notification("caregiver", "A-105", "alert", "Second")
    other = await notifications.insert_notification("township", "A-105", "alert", "Other")

    response = await client.post(f"/api/notifications/{first.notification_id}/read", json={"role": "caregiver"})
    assert response.status_code == 200 and response.json()["read"] is True
    assert [kind for kind, _ in broadcasts] == ["notification.updated"]
    assert (await client.post(f"/api/notifications/{other.notification_id}/read", json={"role": "caregiver"})).status_code == 404
    assert (await client.post("/api/notifications/missing/read", json={"role": "caregiver"})).status_code == 404

    feed = (await client.get("/api/notifications", params={"role": "caregiver"})).json()
    assert {item["notification_id"]: item["read"] for item in feed} == {
        first.notification_id: True, second.notification_id: False,
    }
    assert (await client.get("/api/notifications", params={"role": "township"})).json()[0]["read"] is False


# 6 -----------------------------------------------------------------------------------------


async def test_community_respond(client, broadcasts):
    for action in ("invite_resident", "join_together"):
        r = await client.post("/api/community/activities/c1/respond", json={"action": action})
        assert r.status_code == 200 and r.json() == {"ok": True}
    assert (await client.post("/api/community/activities/c9/respond", json={"action": "join_together"})).status_code == 404
    assert (await client.post("/api/community/activities/c1/respond", json={"action": "dance"})).status_code == 422

    async with pool.get_pool().acquire() as c:
        assert await c.fetchval("select count(*) from community_responses") == 2
    assert broadcasts == []  # stored only
    assert (await client.get("/api/notifications", params={"role": "caregiver"})).json() == []


# 7 -----------------------------------------------------------------------------------------


async def test_reset_clears_runtime_data_and_broadcasts_snapshot(client, broadcasts):
    await add_incident_with_reading()
    await client.post("/api/companion/messages", json={"unit_id": "A-105", "from_name": "Sarah Lee", "preset_id": "p2"})
    await client.post("/api/companion/buddy/request", json={"unit_id": "A-105"})
    await client.post("/api/community/activities/c1/respond", json={"action": "join_together"})
    broadcasts.clear()

    assert (await client.post("/api/demo/reset")).status_code == 200

    assert (await client.get("/api/units/A-105/readings")).json() == []
    assert (await client.get("/api/units/A-105/incidents")).json() == []
    assert (await client.get("/api/units/A-105")).json()["active_incident_id"] is None
    for role in ("caregiver", "township"):
        assert (await client.get("/api/notifications", params={"role": role})).json() == []
    assert (await client.get("/api/companion/messages", params={"unit_id": "A-105"})).json() == []
    assert (await client.get("/api/companion/buddy", params={"unit_id": "A-105"})).json() is None
    async with pool.get_pool().acquire() as c:
        assert await c.fetchval("select count(*) from community_responses") == 0

    assert [t for t, _ in broadcasts] == ["snapshot"]
    snapshot = broadcasts[0][1]
    assert isinstance(snapshot, Snapshot)
    assert len(snapshot.units) == 6 and snapshot.incidents == [] and snapshot.notifications == []
    assert snapshot.config == Config(
        grace_period_seconds=settings.grace_period_seconds,
        reminder_interval_seconds=settings.reminder_interval_seconds,
    )


# 8 -----------------------------------------------------------------------------------------


async def test_data_access_round_trip_for_backend_1(db):
    now = utc_now()
    async with pool.get_pool().acquire() as conn, conn.transaction():
        incident = await incidents.create_incident("A-105", now, now + timedelta(seconds=15), conn=conn)
        await incidents.add_incident_event(incident.incident_id, "detected", now, conn=conn)
        await incidents.update_incident(
            incident.incident_id, state="notified", next_reminder_at=now + timedelta(seconds=15), conn=conn
        )
        await incidents.update_incident(incident.incident_id, next_reminder_at=None, conn=conn)
        # A NotFoundError must not abort the caller's transaction.
        with pytest.raises(NotFoundError):
            await incidents.add_incident_event("missing", "detected", now, conn=conn)
        await units.update_unit_state("A-105", status="unusual_inactivity", conn=conn)

    got = await incidents.get_incident(incident.incident_id)
    assert got.state == "notified" and got.next_reminder_at is None
    assert got.grace_ends_at is not None  # untouched by the later update
    assert [e.type for e in got.events] == ["detected"]
    unit = await units.get_unit("A-105")
    assert unit.active_incident_id == incident.incident_id
    assert unit.status == "unusual_inactivity"
    assert [i.incident_id for i in await incidents.list_active_incidents()] == [incident.incident_id]
