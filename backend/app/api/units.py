from fastapi import APIRouter

from app.db import units as db_units
from app.models import Unit

router = APIRouter(tags=["units"])


@router.get("/units", response_model=list[Unit])
async def get_units() -> list[Unit]:
    """All units in unit_id order. The frontend sorts Unresolved Concern to the top (T1)."""
    return await db_units.list_units()
