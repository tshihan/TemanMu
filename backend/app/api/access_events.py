from fastapi import APIRouter, HTTPException

from app.models import AccessEventAccepted, AccessEventIn
from app.services import monitoring

router = APIRouter(tags=["access events"])


@router.post("/access-events", status_code=201, response_model=AccessEventAccepted)
async def post_access_event(body: AccessEventIn) -> AccessEventAccepted:
    """Record and broadcast a resident's card tap for the controllable card home."""
    try:
        event, unit = await monitoring.ingest_access_event(body)
    except monitoring.UnitNotFound:
        raise HTTPException(status_code=404, detail="Unit not found") from None
    except monitoring.UnitNotControllable:
        raise HTTPException(status_code=403, detail="Only the controllable unit accepts access events") from None
    except monitoring.UnitNotCardHome:
        raise HTTPException(status_code=409, detail="This unit uses a door sensor, not an access card") from None
    except monitoring.InvalidAccessEvent as error:
        raise HTTPException(status_code=422, detail=str(error)) from None
    return AccessEventAccepted(event=event, unit=unit)
