"""Access-event storage and API tests against TEST_DATABASE_URL, never the demo database."""

import os
from datetime import datetime, timedelta

import pytest

from app.db import access_events, incidents, notifications, readings, units
from app.models import AccessEvent
from app.realtime import broadcast as realtime
from app.timeutil import iso, utc_now

pytestmark = pytest.mark.skipif(
    not os.environ.get("TEST_DATABASE_URL"),
    reason="set TEST_DATABASE_URL to a separate Postgres to run database tests (never the demo database)",
)

BODY = {
    "unit_id": "A-105",
    "card_holder": "Madam Lee Mei Ling",
    "direction": "out",
    "access_point": "Block A lift lobby",
}


async def post(client, **changes):
    return await client.post("/api/access-events", json={**BODY, **changes})


async def test_access_event_is_stored_separately_from_readings(client, broadcasts):
    at = iso(utc_now())
    response = await post(client, at=at)
    assert response.status_code == 201
    body = response.json()
    assert body["accepted"] is True
    assert body["event"] == {**BODY, "at": at}
    # The card-home rules apply: a tap out with a quiet home is a possible outing.
    assert body["unit"]["status"] == "possible_away"
    assert body["unit"]["last_access"] == {"direction": BODY["direction"], "access_point": BODY["access_point"], "at": at}
    assert [event.model_dump(mode="json") for event in await access_events.list_access_events("A-105")] == [body["event"]]
    assert await readings.list_readings("A-105") == []
    assert await incidents.list_incidents() == []
    assert await notifications.list_notifications() == []
    assert [kind for kind, _ in broadcasts] == ["access.received", "unit.updated"]
    assert broadcasts[0][1].model_dump(mode="json") == body["event"]


async def test_timestamp_defaults_to_server_time(client):
    before = utc_now()
    response = await post(client)
    after = utc_now()
    assert response.status_code == 201
    at = datetime.fromisoformat(response.json()["event"]["at"].replace("Z", "+00:00"))
    assert before - timedelta(milliseconds=1) <= at <= after


@pytest.mark.parametrize(
    "changes, status",
    [
        ({"unit_id": "Z-999"}, 404),
        ({"unit_id": "A-101"}, 403),
        ({"direction": "unknown"}, 422),
        ({"direction": "open"}, 422),
        ({"card_holder": "Someone else"}, 422),
        ({"card_holder": "  "}, 422),
        ({"access_point": ""}, 422),
        ({"access_point": "  "}, 422),
        ({"access_point": "x" * 201}, 422),
        ({"at": "2026-11-03T10:12:00"}, 422),
    ],
)
async def test_rejected_events_are_not_stored_or_broadcast(client, broadcasts, changes, status):
    response = await post(client, **changes)
    assert response.status_code == status
    assert broadcasts == []
    assert await access_events.list_access_events("A-105") == []


async def test_door_home_rejects_card_events_and_keeps_door_rules(client, broadcasts):
    await units.update_unit_state("A-105", outing_signal="door")
    before = await units.get_unit("A-105")
    assert (await post(client)).status_code == 409
    assert await units.get_unit("A-105") == before
    assert await access_events.list_access_events("A-105") == []
    assert broadcasts == []

    response = await client.post("/api/readings", json={"unit_id": "A-105", "sensor": "door", "value": "open"})
    assert response.status_code == 201
    assert response.json()["unit"]["status"] == "possible_away"


async def test_broadcast_only_after_event_is_committed(client, monkeypatch):
    received = []

    async def record(kind, event):
        # A separate pool connection must already see the row when clients are notified.
        if kind == "access.received":
            assert await access_events.list_access_events("A-105") == [event]
            received.append(event)

    monkeypatch.setattr(realtime, "broadcast", record)
    assert (await post(client, direction="in")).status_code == 201
    assert len(received) == 1


async def test_tap_in_waits_for_activity_at_home(client):
    assert (await post(client, direction="out")).status_code == 201
    unit = (await post(client, direction="in")).json()["unit"]
    assert unit["status"] == "routine"
    assert unit["awaiting_arrival_since"] is not None
    reading = await client.post("/api/readings", json={"unit_id": "A-105", "sensor": "electricity", "value": 1.8})
    assert reading.json()["unit"]["awaiting_arrival_since"] is None


async def test_failed_insert_does_not_broadcast(client, broadcasts, monkeypatch):
    async def fail(event, conn=None):
        raise RuntimeError("storage unavailable")

    monkeypatch.setattr(access_events, "insert_access_event", fail)
    with pytest.raises(RuntimeError, match="storage unavailable"):
        await post(client)
    assert broadcasts == []
    assert await access_events.list_access_events("A-105") == []


async def test_access_event_does_not_resolve_an_active_incident(client):
    now = utc_now()
    incident = await incidents.create_incident("A-105", now, now + timedelta(seconds=20))
    await units.update_unit_state("A-105", status="unusual_inactivity")
    response = await post(client, direction="in")
    assert response.status_code == 201
    assert response.json()["unit"]["active_incident_id"] == incident.incident_id
    assert response.json()["unit"]["status"] == "unusual_inactivity"
    assert (await incidents.get_incident(incident.incident_id)).state == "grace"


async def test_access_events_are_ordered_filtered_and_isolated(db):
    now = utc_now()
    for unit_id, seconds, direction in [("A-105", 0, "in"), ("A-105", -10, "out"), ("A-101", 1, "out")]:
        await access_events.insert_access_event(AccessEvent(
            **{**BODY, "unit_id": unit_id, "direction": direction}, at=now + timedelta(seconds=seconds),
        ))
    assert [event.direction for event in await access_events.list_access_events("A-105")] == ["out", "in"]
    assert [event.direction for event in await access_events.list_access_events("A-105", since=now)] == ["in"]


async def test_reset_clears_access_events_and_keeps_home_settings(client):
    assert (await post(client)).status_code == 201
    response = await client.post("/api/demo/reset")
    assert response.status_code == 200
    assert await access_events.list_access_events("A-105") == []
    assert {unit["unit_id"]: unit["outing_signal"] for unit in response.json()["units"]} == {
        "A-101": "door", "A-102": "door", "A-103": "door",
        "A-104": "door", "A-105": "card", "A-106": "door",
    }
