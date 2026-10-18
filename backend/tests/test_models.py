from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from app.models import Actor, CloseRequest, CompanionMessage, Incident, IncidentEvent, Reading

T = datetime(2026, 10, 15, 1, 2, 3, 123456, tzinfo=timezone.utc)


def test_timestamps_serialise_as_utc_z_millis():
    r = Reading(unit_id="A-105", sensor="water", value=6.0, recorded_at=T.astimezone(timezone(timedelta(hours=8))))
    assert r.model_dump(mode="json")["recorded_at"] == "2026-10-15T01:02:03.123Z"
    assert '"recorded_at":"2026-10-15T01:02:03.123Z"' in r.model_dump_json()


def test_timestamp_accepts_z_suffix():
    r = Reading.model_validate({"unit_id": "A-105", "sensor": "door", "value": "open", "recorded_at": "2026-10-15T01:02:03Z"})
    assert r.recorded_at == datetime(2026, 10, 15, 1, 2, 3, tzinfo=timezone.utc)


def test_naive_timestamp_rejected():
    with pytest.raises(ValidationError, match="timezone"):
        Reading.model_validate({"unit_id": "A-105", "sensor": "water", "value": 6, "recorded_at": "2026-10-15T08:00:00"})


@pytest.mark.parametrize(
    "sensor,value",
    [("door", 1.0), ("water", "open"), ("electricity", "closed"), ("water", -1)],
)
def test_reading_value_must_match_sensor(sensor, value):
    with pytest.raises(ValidationError):
        Reading(unit_id="A-105", sensor=sensor, value=value, recorded_at=T)


def test_door_reading_keeps_string_value():
    assert Reading(unit_id="A-105", sensor="door", value="closed", recorded_at=T).value == "closed"


def test_incident_event_omits_null_actor_and_detail():
    assert IncidentEvent(type="detected", at=T).model_dump(mode="json") == {
        "type": "detected",
        "at": "2026-10-15T01:02:03.123Z",
    }
    full = IncidentEvent(type="acknowledged", at=T, actor=Actor(role="caregiver", name="Sarah Lee"), detail="x")
    assert full.model_dump(mode="json")["actor"] == {"role": "caregiver", "name": "Sarah Lee"}


def test_incident_keeps_explicit_nulls_but_events_omit_them():
    incident = Incident(
        incident_id="i1",
        unit_id="A-105",
        state="grace",
        opened_at=T,
        grace_ends_at=T,
        next_reminder_at=None,
        reminder_count=0,
        acknowledged_by=None,
        outcome=None,
        closed_at=None,
        events=[IncidentEvent(type="detected", at=T)],
    )
    data = incident.model_dump(mode="json")
    assert data["next_reminder_at"] is None and data["acknowledged_by"] is None
    assert data["events"] == [{"type": "detected", "at": "2026-10-15T01:02:03.123Z"}]


def test_close_request_trims_and_limits_report():
    body = {"role": "township", "name": "Guard Ali", "outcome": "resident_ok"}
    assert CloseRequest(**body, report="  Resident answered the door.  ").report == "Resident answered the door."
    with pytest.raises(ValidationError):
        CloseRequest(**body, report="   ")
    with pytest.raises(ValidationError):
        CloseRequest(**body, report="x" * 501)
    with pytest.raises(ValidationError):
        CloseRequest(**body)


def test_companion_message_constants():
    m = CompanionMessage(message_id="m1", unit_id="A-105", from_name="Sarah Lee", preset_id="p1", text="Hi", sent_at=T)
    data = m.model_dump(mode="json")
    assert (data["channel"], data["simulated"], data["status"]) == ("voice_call", True, "delivered")
