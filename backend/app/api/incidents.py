from fastapi import APIRouter, HTTPException

from app.db import incidents as db_incidents
from app.models import AcknowledgeRequest, CloseRequest, Incident
from app.services import monitoring

router = APIRouter(tags=["incidents"])


def _http_error(e: monitoring.MonitoringError) -> HTTPException:
    if isinstance(e, monitoring.IncidentNotFound):
        return HTTPException(status_code=404, detail="Incident not found")
    if isinstance(e, monitoring.NotAcknowledger):
        return HTTPException(status_code=403, detail=str(e))
    return HTTPException(status_code=409, detail=str(e))


@router.get("/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str) -> Incident:
    incident = await db_incidents.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("/incidents/{incident_id}/acknowledge", response_model=Incident)
async def acknowledge_incident(incident_id: str, body: AcknowledgeRequest) -> Incident:
    """Responder takes the incident. 409 if it is already acknowledged or closed."""
    try:
        return await monitoring.acknowledge(incident_id, body.role, body.name)
    except (monitoring.IncidentNotFound, monitoring.IncidentConflict) as e:
        raise _http_error(e) from None


@router.post("/incidents/{incident_id}/close", response_model=Incident)
async def close_incident(incident_id: str, body: CloseRequest) -> Incident:
    """The acknowledger logs the outcome. 409 unless acknowledged, 403 for anyone else."""
    try:
        return await monitoring.close(incident_id, body.role, body.name, body.outcome)
    except (monitoring.IncidentNotFound, monitoring.IncidentConflict, monitoring.NotAcknowledger) as e:
        raise _http_error(e) from None
