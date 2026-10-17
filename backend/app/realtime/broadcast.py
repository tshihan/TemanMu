"""WebSocket connection manager and broadcast(). Owned by Backend 1.

Call broadcast as a module attribute (`from app.realtime import broadcast as realtime`,
then `await realtime.broadcast(...)`) so tests can monkeypatch it.
"""

import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket
from pydantic import BaseModel

from app.timeutil import iso, utc_now

logger = logging.getLogger(__name__)

SEND_TIMEOUT_SECONDS = 2.0


def to_jsonable(data: Any) -> Any:
    """Pydantic models → model_dump(mode="json"); lists are mapped recursively."""
    if isinstance(data, BaseModel):
        return data.model_dump(mode="json")
    if isinstance(data, (list, tuple)):
        return [to_jsonable(item) for item in data]
    return data


def envelope(event_type: str, data: Any) -> str:
    """The wire format: {"type", "at", "data"} as JSON text."""
    return json.dumps({"type": event_type, "at": iso(utc_now()), "data": to_jsonable(data)})


class ConnectionManager:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        # Concurrent send_text calls on one socket are unsafe, so each client gets a lock.
        self._send_locks: dict[WebSocket, asyncio.Lock] = {}

    @property
    def clients(self) -> set[WebSocket]:
        return set(self._clients)

    def register(self, ws: WebSocket) -> None:
        self._clients.add(ws)
        self._send_locks[ws] = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.register(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.discard(ws)
        self._send_locks.pop(ws, None)

    async def _send_text(self, ws: WebSocket, text: str) -> None:
        lock = self._send_locks.get(ws)
        if lock is None:  # already disconnected
            return
        async with lock:
            await ws.send_text(text)

    async def send(self, ws: WebSocket, event_type: str, data: Any) -> None:
        """Send one event to one client."""
        await self._send_text(ws, envelope(event_type, data))

    async def broadcast(self, event_type: str, data: Any) -> None:
        """Send one event to every client. Drops clients that fail or time out. Never raises."""
        try:
            text = envelope(event_type, data)
        except Exception:
            logger.exception("Could not serialise %s event", event_type)
            return
        clients = list(self._clients)
        if not clients:
            return

        async def send_one(ws: WebSocket) -> None:
            try:
                await asyncio.wait_for(self._send_text(ws, text), SEND_TIMEOUT_SECONDS)
            except Exception as exc:
                logger.warning("Dropping WebSocket client after failed %s send: %r", event_type, exc)
                self.disconnect(ws)

        await asyncio.gather(*(send_one(ws) for ws in clients))


manager = ConnectionManager()


async def broadcast(event_type: str, data: Any) -> None:
    """Send {type, at, data} to every connected socket. data may be a Pydantic model or list."""
    await manager.broadcast(event_type, data)
