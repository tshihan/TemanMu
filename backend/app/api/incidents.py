from fastapi import APIRouter, HTTPException

from app.db import incidents as db_incidents
from app.models import Incident

router = APIRouter(tags=["incidents"])


@router.get("/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str) -> Incident:
    incident = await db_incidents.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


# Backend 1: POST /incidents/{incident_id}/acknowledge and /close go here (PRD §8.4).
