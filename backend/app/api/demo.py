from fastapi import APIRouter, HTTPException

from app.models import ResetResponse
from app.seed import SeedError
from app.services.reset import reset_demo

router = APIRouter(tags=["demo"])


@router.post("/demo/reset", response_model=ResetResponse)
async def post_reset() -> ResetResponse:
    """Clear readings, incidents, notifications, messages and buddy matches, reload
    shared/seed.json, and broadcast a fresh `snapshot` to every socket."""
    try:
        units = await reset_demo()
    except SeedError as e:
        # The database is untouched; show the presenter exactly what is wrong with the seed.
        raise HTTPException(status_code=500, detail=str(e)) from None
    return ResetResponse(units=units)
