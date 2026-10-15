from fastapi import APIRouter, HTTPException

from app.api.deps import require_unit
from app.db import companion as db_companion
from app.models import BuddyMatch, BuddyRequest, CompanionMessage, MessagePreset, SendMessageRequest
from app.services import companion as companion_service
from app.services.companion import AlreadyMatched, CompanionError

router = APIRouter(tags=["companion"])


def _http_error(e: CompanionError) -> HTTPException:
    return HTTPException(status_code=409 if isinstance(e, AlreadyMatched) else 404, detail=str(e))


@router.get("/companion/messages", response_model=list[CompanionMessage])
async def get_messages(unit_id: str) -> list[CompanionMessage]:
    """Thinking-of-you messages sent to the unit, newest first."""
    await require_unit(unit_id)
    return await db_companion.list_messages(unit_id)


@router.post("/companion/messages", status_code=201, response_model=CompanionMessage)
async def post_message(body: SendMessageRequest) -> CompanionMessage:
    """Send a preset message as a simulated one-way voice call.

    Adds a caregiver `message_delivered` notification and broadcasts
    `companion.message_delivered` (the 3D home rings the phone). 404 if the unit or preset
    does not exist.
    """
    try:
        return await companion_service.send_message(body.unit_id, body.from_name, body.preset_id)
    except CompanionError as e:
        raise _http_error(e) from None


@router.get("/companion/message-presets", response_model=list[MessagePreset])
async def get_message_presets() -> list[MessagePreset]:
    return await db_companion.list_presets()


@router.get("/companion/buddy", response_model=BuddyMatch | None)
async def get_buddy(unit_id: str) -> BuddyMatch | None:
    """The unit's buddy match, or JSON null (200) if it has none yet."""
    await require_unit(unit_id)
    return await companion_service.get_buddy_match(unit_id)


@router.post("/companion/buddy/request", status_code=201, response_model=BuddyMatch)
async def post_buddy_request(body: BuddyRequest) -> BuddyMatch:
    """Match the resident with a pre-seeded volunteer who shares an interest.

    409 if already matched; 404 if the unit does not exist or no buddy shares an interest.
    Adds a caregiver `buddy_matched` notification.
    """
    try:
        return await companion_service.request_buddy(body.unit_id)
    except CompanionError as e:
        raise _http_error(e) from None
