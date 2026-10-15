from fastapi import APIRouter

from app.api.deps import require_unit
from app.db import companion as db_companion
from app.models import BuddyMatch, CompanionMessage, MessagePreset
from app.services import companion as companion_service

router = APIRouter(tags=["companion"])


@router.get("/companion/messages", response_model=list[CompanionMessage])
async def get_messages(unit_id: str) -> list[CompanionMessage]:
    """Thinking-of-you messages sent to the unit, newest first."""
    await require_unit(unit_id)
    return await db_companion.list_messages(unit_id)


@router.get("/companion/message-presets", response_model=list[MessagePreset])
async def get_message_presets() -> list[MessagePreset]:
    return await db_companion.list_presets()


@router.get("/companion/buddy", response_model=BuddyMatch | None)
async def get_buddy(unit_id: str) -> BuddyMatch | None:
    """The unit's buddy match, or JSON null (200) if it has none yet."""
    await require_unit(unit_id)
    return await companion_service.get_buddy_match(unit_id)
