"""Backend 1 owns this module. Stub so Backend 2 code can run until it is replaced."""

import logging
from typing import Any

logger = logging.getLogger(__name__)


async def broadcast(event_type: str, data: Any) -> None:
    """Send {type, at, data} to every connected socket. data may be a Pydantic model or list."""
    logger.info("broadcast %s (stub)", event_type)
