from fastapi import APIRouter, HTTPException

from app.models import ReadingAccepted, ReadingIn
from app.services import monitoring

router = APIRouter(tags=["readings"])


@router.post("/readings", status_code=201, response_model=ReadingAccepted)
async def post_reading(body: ReadingIn) -> ReadingAccepted:
    """Accept a sensor reading for the controllable unit, apply the status rules and broadcast."""
    try:
        unit = await monitoring.ingest_reading(body)
    except monitoring.UnitNotFound:
        raise HTTPException(status_code=404, detail="Unit not found") from None
    except monitoring.UnitNotControllable:
        raise HTTPException(status_code=403, detail="Only the controllable unit accepts readings") from None
    return ReadingAccepted(unit=unit)
