from fastapi import APIRouter, HTTPException

from app.api.deps import require_unit
from app.db import away_periods as db_away
from app.db import incidents as db_incidents
from app.db import readings as db_readings
from app.db import units as db_units
from app.models import (
    AwayPeriodDetail,
    AwayPeriodRequest,
    CancelAwayPeriodRequest,
    ConfirmHomeRequest,
    Incident,
    IncidentState,
    Reading,
    Role,
    Unit,
    UtcDatetime,
)
from app.services import monitoring

router = APIRouter(tags=["units"])


@router.get("/units", response_model=list[Unit])
async def get_units() -> list[Unit]:
    """All units in unit_id order. The frontend sorts Unresolved Concern to the top (T1)."""
    return await db_units.list_units()


@router.get("/units/{unit_id}", response_model=Unit)
async def get_unit(unit_id: str) -> Unit:
    unit = await db_units.get_unit(unit_id)
    if unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    return unit


@router.post("/units/{unit_id}/confirm-home", response_model=Unit)
async def confirm_home(unit_id: str, body: ConfirmHomeRequest) -> Unit:
    """Caregiver reports a direct call confirming the resident is home and okay."""
    try:
        return await monitoring.confirm_home_after_call(unit_id, body.name.strip())
    except monitoring.UnitNotFound:
        raise HTTPException(status_code=404, detail="Unit not found") from None
    except monitoring.IncidentConflict as error:
        raise HTTPException(status_code=409, detail=str(error)) from None


@router.get("/units/{unit_id}/away-periods", response_model=list[AwayPeriodDetail])
async def get_away_periods(unit_id: str, role: Role) -> list[AwayPeriodDetail]:
    """Current and upcoming away periods with their reasons. The reason is private to the
    caregiver, so township gets 403; Unit.away_periods (sent to everyone) has no reason."""
    if role != "caregiver":
        raise HTTPException(status_code=403, detail="Away reasons are visible to the caregiver only")
    await require_unit(unit_id)
    return [AwayPeriodDetail(**dict(row)) for row in await db_away.list_current(unit_id)]


@router.post("/units/{unit_id}/away-periods", response_model=Unit)
async def add_away_period(unit_id: str, body: AwayPeriodRequest) -> Unit:
    """Caregiver declares a time the resident is not at home. Inactivity alerts pause for it."""
    try:
        return await monitoring.add_away_period(
            unit_id, body.name.strip(), body.starts_at, body.ends_at, body.reason
        )
    except monitoring.UnitNotFound:
        raise HTTPException(status_code=404, detail="Unit not found") from None
    except monitoring.InvalidAwayPeriod as error:
        raise HTTPException(status_code=422, detail=str(error)) from None
    except monitoring.IncidentConflict as error:
        raise HTTPException(status_code=409, detail=str(error)) from None


@router.post("/units/{unit_id}/away-periods/{period_id}/cancel", response_model=Unit)
async def cancel_away_period(unit_id: str, period_id: str, body: CancelAwayPeriodRequest) -> Unit:
    """End an away period now if it has started, or cancel it if it has not."""
    try:
        return await monitoring.cancel_away_period(unit_id, period_id, body.name.strip())
    except monitoring.UnitNotFound:
        raise HTTPException(status_code=404, detail="Unit not found") from None
    except monitoring.AwayPeriodNotFound:
        raise HTTPException(status_code=404, detail="Away period not found") from None
    except monitoring.IncidentConflict as error:
        raise HTTPException(status_code=409, detail=str(error)) from None


@router.get("/units/{unit_id}/readings", response_model=list[Reading])
async def get_unit_readings(unit_id: str, since: UtcDatetime | None = None) -> list[Reading]:
    """Readings for the timelines, oldest first.

    `since` is an ISO-8601 timestamp with a time zone (e.g. 2026-10-15T01:02:03.123Z); readings
    at or after it are returned. Without it, all readings since the last demo reset.
    """
    await require_unit(unit_id)
    return await db_readings.list_readings(unit_id, since)


@router.get("/units/{unit_id}/incidents", response_model=list[Incident])
async def get_unit_incidents(unit_id: str, state: IncidentState | None = None) -> list[Incident]:
    """Incidents for a unit, newest first.

    The `state` filter is literal: `state=closed` returns only incidents closed by a responder
    and does NOT include `auto_resolved` ones. For a full history, call once per state or omit
    the filter.
    """
    await require_unit(unit_id)
    return await db_incidents.list_incidents(unit_id, [state] if state else None)
