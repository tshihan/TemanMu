from fastapi import APIRouter, HTTPException

from app.api.deps import require_unit
from app.db import community as db_community
from app.models import CommunityActivity, CommunityRespondRequest, OkResponse

router = APIRouter(tags=["community"])


@router.get("/community/activities", response_model=list[CommunityActivity])
async def get_activities(unit_id: str | None = None) -> list[CommunityActivity]:
    """Activities ordered by starts_at. With unit_id, only those near that unit."""
    if unit_id is not None:
        await require_unit(unit_id)
    return await db_community.list_activities(unit_id)


@router.post("/community/activities/{activity_id}/respond", response_model=OkResponse)
async def respond_to_activity(activity_id: str, body: CommunityRespondRequest) -> OkResponse:
    """Record "Invite Mum" or "Join together". Stored only: no notification or broadcast
    (PRD §12 item 8)."""
    if await db_community.get_activity(activity_id) is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    await db_community.insert_response(activity_id, body.action)
    return OkResponse()
