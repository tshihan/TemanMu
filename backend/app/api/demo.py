from typing import Literal

from fastapi import APIRouter, HTTPException

from app.models import ContractModel, Incident, MonitoringIn, MonitoringResponse, ResetResponse
from app.seed import SeedError
from app.services import monitoring
from app.services.reset import reset_demo
from app.settings import settings

router = APIRouter(tags=["demo"])


class CallConfirmation(ContractModel):
    confirmed_safe: Literal[True]


@router.post("/demo/incidents/{incident_id}/confirm-call", response_model=Incident)
async def confirm_call(incident_id: str, body: CallConfirmation) -> Incident:
    """Simulate the resident explicitly confirming safety during the demo call."""
    try:
        return await monitoring.confirm_demo_call(incident_id)
    except monitoring.IncidentNotFound:
        raise HTTPException(status_code=404, detail="Incident not found") from None
    except monitoring.IncidentConflict as e:
        raise HTTPException(status_code=409, detail=str(e)) from None


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


@router.post("/demo/monitoring", response_model=MonitoringResponse)
async def post_monitoring(body: MonitoringIn) -> MonitoringResponse:
    """Turn the controllable unit's quiet-gap watch on (with a fresh clock) or off.

    The 3D home turns it on while a scenario plays. Off after reset and restart. Turning it off
    leaves an active incident's grace and reminder timers running.
    """
    unit_id = settings.controllable_unit_id
    if body.active:
        try:
            await monitoring.start_watching(unit_id, body.grace_period_seconds, body.voice_call_ring_seconds)
        except monitoring.UnitNotFound:
            raise HTTPException(status_code=404, detail="Unit not found. Call POST /api/demo/reset.") from None
    else:
        await monitoring.stop_watching(unit_id)
    return MonitoringResponse(unit_id=unit_id, active=monitoring.is_watching(unit_id))
