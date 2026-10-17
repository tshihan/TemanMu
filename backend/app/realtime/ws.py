"""WebSocket endpoint /ws: sends a snapshot on connect, then live events via broadcast()."""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.realtime.broadcast import manager
from app.services.snapshot import build_snapshot

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    await manager.connect(ws)  # register first, so no event is missed
    try:
        try:
            snapshot = await build_snapshot()
        except Exception:
            logger.exception("Could not build snapshot for new WebSocket client")
            await ws.close(code=1011)
            return
        await manager.send(ws, "snapshot", snapshot)
        while True:
            await ws.receive_text()  # client messages are ignored; this detects disconnect
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(ws)
