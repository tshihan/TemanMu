from fastapi import APIRouter

from app.api.deps import require_unit
from app.db import community as db_community
from app.models import CommunityActivity

router = APIRouter(tags=["community"])


@router.get("/community/activities", response_model=list[CommunityActivity])
async def get_activities(unit_id: str | None = None) -> list[CommunityActivity]:
    """Activities ordered by starts_at. With unit_id, only those near that unit."""
    if unit_id is not None:
        await require_unit(unit_id)
    return await db_community.list_activities(unit_id)
