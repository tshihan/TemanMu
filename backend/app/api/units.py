from fastapi import APIRouter, HTTPException

from app.api.deps import require_unit
from app.db import incidents as db_incidents
from app.db import readings as db_readings
from app.db import units as db_units
from app.models import Incident, IncidentState, Reading, Unit, UtcDatetime

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
