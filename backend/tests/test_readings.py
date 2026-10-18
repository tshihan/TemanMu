"""POST /api/readings tests against a real Postgres (TEST_DATABASE_URL)."""

import os
from datetime import datetime, timedelta

import pytest

from app.db import notifications, units
from app.timeutil import iso, utc_now

pytestmark = pytest.mark.skipif(
    not os.environ.get("TEST_DATABASE_URL"),
    reason="set TEST_DATABASE_URL to a separate Postgres to run database tests (never the demo database)",
)


async def post(client, sensor, value, unit_id="A-105", **extra):
    return await client.post("/api/readings", json={"unit_id": unit_id, "sensor": sensor, "value": value, **extra})


async def morning_notifications() -> list:
    return [n for n in await notifications.list_notifications() if n.kind == "morning_reassurance"]


async def test_reading_is_stored_and_returned(client):
    at = iso(utc_now())
    r = await post(client, "water", 6, recorded_at=at)
    assert r.status_code == 201
    body = r.json()
    assert body["accepted"] is True
    assert body["unit"]["unit_id"] == "A-105"
    assert body["unit"]["latest"]["water_lpm"] == 6
    assert body["unit"]["quiet_gap"]["last_water_activity_at"] == at

    stored = (await client.get("/api/units/A-105/readings")).json()
    assert stored[-1] == {"unit_id": "A-105", "sensor": "water", "value": 6, "recorded_at": at}


async def test_recorded_at_defaults_to_server_time(client):
    before = utc_now()
    await post(client, "door", "closed")
    after = utc_now()
    [reading] = (await client.get("/api/units/A-105/readings")).json()
    recorded = datetime.fromisoformat(reading["recorded_at"].replace("Z", "+00:00"))
    assert before - timedelta(milliseconds=1) <= recorded <= after


@pytest.mark.parametrize(
    ("unit_id", "sensor", "value", "status"),
    [
        ("Z-999", "water", 6, 404),
        ("A-101", "water", 6, 403),
        ("A-105", "door", 5, 422),
        ("A-105", "water", "open", 422),
        ("A-105", "electricity", -1, 422),
        ("A-105", "gas", 1, 422),
    ],
)
async def test_rejected_readings(client, broadcasts, unit_id, sensor, value, status):
    r = await post(client, sensor, value, unit_id=unit_id)
    assert r.status_code == status
    assert broadcasts == []
    assert (await client.get("/api/units/A-105/readings")).json() == []


async def test_naive_recorded_at_is_422(client):
    r = await post(client, "water", 6, recorded_at="2026-10-15T08:00:00")
    assert r.status_code == 422


async def test_broadcast_order(client, broadcasts):
    await post(client, "water", 0)
    assert [t for t, _ in broadcasts] == ["reading.received", "unit.updated"]
    assert broadcasts[0][1].sensor == "water"
    assert broadcasts[1][1].unit_id == "A-105"


async def test_first_activity_sends_one_morning_reassurance(client, broadcasts):
    await post(client, "water", 6)
    assert [t for t, _ in broadcasts] == ["reading.received", "unit.updated", "notification.created"]
    [n] = await morning_notifications()
    assert n.role == "caregiver"
    assert n.unit_id == "A-105"
    assert n.message == "Mum's day has started. Water used at home."
    assert n.incident_id is None

    await post(client, "electricity", 1.8)
    await post(client, "water", 4)
    assert len(await morning_notifications()) == 1


async def test_first_door_open_names_the_action(client):
    await post(client, "door", "open")
    [n] = await morning_notifications()
    assert n.message == "Mum's day has started. Front door opened at home."


async def test_non_activity_sends_no_reassurance(client):
    await post(client, "water", 0)
    await post(client, "electricity", 0.15)
    await post(client, "door", "closed")
    assert await morning_notifications() == []


async def test_reset_allows_a_new_reassurance(client):
    await post(client, "water", 6)
    await client.post("/api/demo/reset")
    await post(client, "water", 6)
    assert len(await morning_notifications()) == 1


async def test_going_out_and_back(client):
    body = (await post(client, "door", "open")).json()
    assert body["unit"]["status"] == "possible_away"
    assert body["unit"]["status_reason"].endswith("then no water use and electricity back to standby: probably out")

    body = (await post(client, "door", "closed")).json()
    assert body["unit"]["status"] == "possible_away"

    body = (await post(client, "electricity", 1.8)).json()
    assert body["unit"]["status"] == "routine"
    assert body["unit"]["status_reason"].endswith("and electricity use detected: back home")


async def test_door_open_while_kettle_on_stays_home(client):
    await post(client, "electricity", 1.8)
    body = (await post(client, "door", "open")).json()
    assert body["unit"]["status"] == "routine"
    assert "while electricity was in use: at home" in body["unit"]["status_reason"]


async def test_electricity_does_not_move_quiet_gap_anchor(client):
    anchor = (await units.get_unit("A-105")).quiet_gap.last_water_activity_at
    body = (await post(client, "electricity", 1.8)).json()
    assert body["unit"]["quiet_gap"]["last_water_activity_at"] == iso(anchor)
    assert body["unit"]["status_reason"] == "Water and electricity activity within usual routine"


async def test_reading_arms_watch_timer(client):
    from app import timers
    from app.services import monitoring

    await monitoring.start_watching("A-105")
    await post(client, "water", 6)
    assert "watch:A-105" in timers.scheduled_keys()
