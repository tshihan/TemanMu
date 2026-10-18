from fastapi import APIRouter, HTTPException

from app.api.deps import require_unit
from app.db import companion as db_companion
from app.models import (
    BuddyMatch,
    BuddyRequest,
    CompanionMessage,
    MessagePreset,
    NeighbourConsentRequest,
    NeighbourIntroduceRequest,
    NeighbourState,
    SendMessageRequest,
)
from app.services import companion as companion_service
from app.services import neighbours as neighbours_service
from app.services.companion import AlreadyMatched, CompanionError
from app.services.neighbours import AlreadyRequested, NotOptedIn

router = APIRouter(tags=["companion"])


def _http_error(e: CompanionError) -> HTTPException:
    return HTTPException(status_code=409 if isinstance(e, AlreadyMatched | AlreadyRequested | NotOptedIn) else 404, detail=str(e))


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


@router.get("/companion/neighbours", response_model=NeighbourState)
async def get_neighbours(unit_id: str) -> NeighbourState:
    """Whether the resident agreed to be introduced, and their same-hour neighbour if so.

    The match carries only coarse labels: never times or the neighbour's unit_id. 404 if the
    unit does not exist.
    """
    try:
        return await neighbours_service.get_state(unit_id)
    except CompanionError as e:
        raise _http_error(e) from None


@router.post("/companion/neighbours/consent", response_model=NeighbourState)
async def post_neighbour_consent(body: NeighbourConsentRequest) -> NeighbourState:
    """Record (open=true) or withdraw (open=false) the resident's consent. Idempotent.

    Withdrawing also drops any introduction involving the resident. 404 if the unit does not
    exist.
    """
    try:
        return await neighbours_service.set_consent(body.unit_id, body.open)
    except CompanionError as e:
        raise _http_error(e) from None


@router.post("/companion/neighbours/introduce", status_code=201, response_model=NeighbourState)
async def post_neighbour_introduce(body: NeighbourIntroduceRequest) -> NeighbourState:
    """Ask the community coordinator to introduce the pair in person (recorded only).

    409 if the resident has not agreed or an introduction was already requested; 404 if the
    unit does not exist or no neighbour keeps the same hours. Adds a caregiver
    `neighbour_introduced` notification.
    """
    try:
        return await neighbours_service.request_introduction(body.unit_id)
    except CompanionError as e:
        raise _http_error(e) from None
