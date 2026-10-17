"""WebSocket broadcaster tests. Unit tests use fake sockets; the /ws test needs TEST_DATABASE_URL."""

import json
import os

import pytest

from app.models import Actor, IncidentEvent
from app.realtime.broadcast import ConnectionManager
from app.timeutil import utc_now

needs_db = pytest.mark.skipif(
    not os.environ.get("TEST_DATABASE_URL"),
    reason="set TEST_DATABASE_URL to a separate Postgres to run database tests (never the demo database)",
)


class FakeSocket:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send_text(self, text: str) -> None:
        self.sent.append(json.loads(text))


class BrokenSocket:
    async def send_text(self, text: str) -> None:
        raise RuntimeError("connection reset")


def _manager_with(*sockets) -> ConnectionManager:
    manager = ConnectionManager()
    for ws in sockets:
        manager.register(ws)
    return manager


async def test_envelope_shape():
    ws = FakeSocket()
    await _manager_with(ws).broadcast("demo.event", {"x": 1})

    [msg] = ws.sent
    assert set(msg) == {"type", "at", "data"}
    assert msg["type"] == "demo.event"
    assert msg["at"].endswith("Z")
    assert msg["data"] == {"x": 1}


async def test_lists_of_models_are_serialised():
    ws = FakeSocket()
    now = utc_now()
    events = [
        IncidentEvent(type="detected", at=now, detail="Water quiet gap exceeded"),
        IncidentEvent(type="acknowledged", at=now, actor=Actor(role="township", name="Guard Ali")),
    ]
    await _manager_with(ws).broadcast("events", events)

    data = ws.sent[0]["data"]
    assert data[0]["type"] == "detected"
    assert data[0]["at"].endswith("Z")
    assert data[1]["actor"] == {"role": "township", "name": "Guard Ali"}


async def test_event_without_actor_omits_key():
    ws = FakeSocket()
    await _manager_with(ws).broadcast("event", IncidentEvent(type="detected", at=utc_now()))

    data = ws.sent[0]["data"]
    assert "actor" not in data
    assert "detail" not in data


async def test_failing_client_is_dropped_and_others_still_receive():
    good, bad = FakeSocket(), BrokenSocket()
    manager = _manager_with(good, bad)

    await manager.broadcast("one", 1)
    assert bad not in manager.clients
    assert good in manager.clients

    await manager.broadcast("two", 2)
    assert [m["type"] for m in good.sent] == ["one", "two"]


async def test_send_to_one_client():
    a, b = FakeSocket(), FakeSocket()
    manager = _manager_with(a, b)
    await manager.send(a, "snapshot", {"units": []})
    assert len(a.sent) == 1 and b.sent == []


@needs_db
def test_ws_sends_snapshot_on_connect(migrated):
    # TestClient runs the lifespan, which opens a pool on TEST_DATABASE_URL (set by conftest).
    import asyncio

    from starlette.testclient import TestClient

    from app.db import pool
    from app.main import app
    from app.services.reset import reset_demo

    async def seed() -> None:
        await pool.init_pool(os.environ["TEST_DATABASE_URL"])
        try:
            await reset_demo()
        finally:
            await pool.close_pool()

    asyncio.run(seed())

    with TestClient(app) as client, client.websocket_connect("/ws") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "snapshot"
        assert msg["at"].endswith("Z")
        assert len(msg["data"]["units"]) == 6
