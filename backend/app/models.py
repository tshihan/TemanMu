"""Pydantic models for every PRD §8.1 type, plus Backend 2's request/response bodies.

Shared by Backend 1 and Backend 2. Field names match the API contract exactly; do not rename
without agreeing with the frontend (their mock layer mirrors §8).
"""

from typing import Annotated, Any, Literal, TypeAlias

from pydantic import AwareDatetime, BaseModel, Field, PlainSerializer, model_serializer, model_validator

from app.timeutil import iso

# Timestamps must be timezone-aware on input (a naive value is a 422, not a later 500) and
# always serialise as UTC ISO-8601 with millisecond precision and a Z suffix.
UtcDatetime: TypeAlias = Annotated[AwareDatetime, PlainSerializer(iso, return_type=str)]

UnitId: TypeAlias = str
Role: TypeAlias = Literal["township", "caregiver"]
Sensor: TypeAlias = Literal["water", "electricity", "door"]
DoorState: TypeAlias = Literal["open", "closed"]
Status: TypeAlias = Literal["routine", "possible_away", "unusual_inactivity", "unresolved_concern"]
IncidentState: TypeAlias = Literal["grace", "notified", "acknowledged", "closed", "auto_resolved"]
Outcome: TypeAlias = Literal["resident_ok", "assistance_provided", "resident_away", "resident_activity_detected"]
IncidentEventType: TypeAlias = Literal[
    "detected",
    "voice_call_started",
    "voice_call_no_answer",
    "voice_call_cancelled",
    "notified",
    "reminder",
    "acknowledged",
    "closed",
    "auto_resolved",
]
NotificationKind: TypeAlias = Literal[
    "morning_reassurance",
    "alert",
    "reminder",
    "acknowledged",
    "closed",
    "auto_resolved",
    "message_delivered",
    "buddy_matched",
]
CommunityAction: TypeAlias = Literal["invite_resident", "join_together"]

ACTIVE_INCIDENT_STATES: tuple[IncidentState, ...] = ("grace", "notified", "acknowledged")


class ContractModel(BaseModel):
    """Base for all API models."""


# --- §8.1 shared types -----------------------------------------------------------------


class Reading(ContractModel):
    unit_id: UnitId
    sensor: Sensor
    value: float | DoorState  # water: L/min, electricity: kW, door: "open" | "closed"
    recorded_at: UtcDatetime

    @model_validator(mode="after")
    def _value_matches_sensor(self) -> "Reading":
        check_value_matches_sensor(self.sensor, self.value)
        return self


def check_value_matches_sensor(sensor: Sensor, value: float | DoorState) -> None:
    """Shared by Reading and ReadingIn: door takes "open"/"closed", water/electricity a number >= 0."""
    if sensor == "door":
        if not isinstance(value, str):
            raise ValueError('door readings need value "open" or "closed"')
    elif isinstance(value, str) or value < 0:
        raise ValueError(f"{sensor} readings need a number >= 0")


class Baseline(ContractModel):
    usual_quiet_gap_seconds: int
    usual_outing_seconds: int
    standby_power_kw: float
    source: Literal["simulated_history"] = "simulated_history"


class UnitLatest(ContractModel):
    water_lpm: float
    power_kw: float
    door: DoorState
    last_door_event_at: UtcDatetime | None


class QuietGap(ContractModel):
    last_water_activity_at: UtcDatetime | None
    usual_max_seconds: int


class Unit(ContractModel):
    unit_id: UnitId
    resident_name: str
    caregiver_name: str
    caregiver_relationship: str
    controllable: bool
    status: Status
    status_reason: str
    status_since: UtcDatetime
    latest: UnitLatest
    quiet_gap: QuietGap
    baseline: Baseline
    active_incident_id: str | None


class Actor(ContractModel):
    role: Role
    name: str


class IncidentEvent(ContractModel):
    type: IncidentEventType
    at: UtcDatetime
    actor: Actor | None = None
    detail: str | None = None

    @model_serializer(mode="wrap")
    def _omit_empty_optionals(self, handler: Any) -> dict[str, Any]:
        # §8.1 marks actor and detail optional (absent, not null). Done here rather than with
        # exclude_none at call sites, so FastAPI responses and broadcasts both get it right.
        data = handler(self)
        for key in ("actor", "detail"):
            if data.get(key) is None:
                data.pop(key, None)
        return data


class Acknowledgement(ContractModel):
    role: Role
    name: str
    at: UtcDatetime


class Incident(ContractModel):
    incident_id: str
    unit_id: UnitId
    state: IncidentState
    opened_at: UtcDatetime
    grace_ends_at: UtcDatetime | None
    next_reminder_at: UtcDatetime | None
    reminder_count: int
    acknowledged_by: Acknowledgement | None
    outcome: Outcome | None
    closed_at: UtcDatetime | None
    events: list[IncidentEvent]


class Notification(ContractModel):
    notification_id: str
    role: Role
    unit_id: UnitId
    kind: NotificationKind
    message: str
    incident_id: str | None
    created_at: UtcDatetime
    read: bool


class CommunityActivity(ContractModel):
    activity_id: str
    title: str
    starts_at: UtcDatetime
    location: str
    near_unit_id: UnitId


class MessagePreset(ContractModel):
    preset_id: str
    text: str


class CompanionMessage(ContractModel):
    message_id: str
    unit_id: UnitId
    from_name: str
    preset_id: str
    text: str
    channel: Literal["voice_call"] = "voice_call"
    simulated: Literal[True] = True
    status: Literal["delivered"] = "delivered"
    sent_at: UtcDatetime


class Buddy(ContractModel):
    buddy_id: str
    name: str
    interests: list[str]


class BuddyMatch(ContractModel):
    unit_id: UnitId
    buddy: Buddy
    shared_interest: str
    next_activity: CommunityActivity | None
    simulated: Literal[True] = True
    matched_at: UtcDatetime


class Config(ContractModel):
    grace_period_seconds: int
    reminder_interval_seconds: int


# --- Backend 2 request and response bodies (§8.4, §8.5) ---------------------------------
# Backend 1 adds its own bodies (POST /api/readings, acknowledge, close) here.


class ReadingIn(ContractModel):
    """POST /api/readings body."""

    unit_id: UnitId
    sensor: Sensor
    value: float | DoorState
    recorded_at: UtcDatetime | None = None  # defaults to server time

    @model_validator(mode="after")
    def _value_matches_sensor(self) -> "ReadingIn":
        check_value_matches_sensor(self.sensor, self.value)
        return self


class ReadingAccepted(ContractModel):
    accepted: Literal[True] = True
    unit: Unit


class MarkReadRequest(ContractModel):
    role: Role


class CommunityRespondRequest(ContractModel):
    action: CommunityAction


class SendMessageRequest(ContractModel):
    unit_id: UnitId
    from_name: str = Field(min_length=1)
    preset_id: str


class BuddyRequest(ContractModel):
    unit_id: UnitId


class OkResponse(ContractModel):
    ok: Literal[True] = True


class ResetResponse(ContractModel):
    units: list[Unit]


# --- WebSocket payloads (§8.6) -----------------------------------------------------------


class Snapshot(ContractModel):
    """data of the `snapshot` event: sent on connect and after demo reset."""

    units: list[Unit]
    incidents: list[Incident]
    notifications: list[Notification]
    config: Config
