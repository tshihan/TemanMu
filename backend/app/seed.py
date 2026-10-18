"""Load and validate shared/seed.json, and turn activity schedules into start times.

The shape of seed.json is a contract with the frontend mock layer (PRD §9), so the model is strict.
"""

import json
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from app.models import Status
from app.settings import settings

Weekday = Literal["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
WEEKDAYS: list[str] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

HHMM = Annotated[str, Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")]
LowercaseText = Annotated[str, Field(pattern=r"^[^A-Z]+$")]


class SeedError(ValueError):
    """seed.json is missing, malformed or breaks a seed rule."""


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class SeedResponders(_Strict):
    caregiver: str
    township: str


class SeedLatest(_Strict):
    water_lpm: float = Field(ge=0)
    power_kw: float = Field(ge=0)
    door: Literal["open", "closed"]


class SeedBaseline(_Strict):
    usual_quiet_gap_seconds: int = Field(gt=0)
    usual_outing_seconds: int = Field(gt=0)
    standby_power_kw: float = Field(ge=0)


class SeedOuting(_Strict):
    start: HHMM
    end: HHMM

    @model_validator(mode="after")
    def _check(self) -> "SeedOuting":
        if self.start >= self.end:
            raise ValueError(f"outing start {self.start} must be before end {self.end}")
        return self


class SeedRhythm(_Strict):
    """A resident's typical day, local time, standing in for four weeks of history.

    In production this would be derived from readings: the first water use of the day is the
    wake time, and door open/close pairs are outing windows (median values over 4 weeks).
    """

    wake: HHMM
    outings: list[SeedOuting] = Field(max_length=3)


class SeedUnit(_Strict):
    unit_id: str
    resident_name: str
    caregiver_name: str
    caregiver_relationship: str
    controllable: bool
    status: Status
    status_reason: str
    latest: SeedLatest
    last_water_activity_offset_seconds: int | None
    last_door_event_offset_seconds: int | None
    interests: list[LowercaseText]
    baseline: SeedBaseline
    rhythm: SeedRhythm
    open_to_neighbours: bool

    @model_validator(mode="after")
    def _check(self) -> "SeedUnit":
        for name in ("last_water_activity_offset_seconds", "last_door_event_offset_seconds"):
            offset = getattr(self, name)
            if offset is not None and offset > 0:
                raise ValueError(f"{name} must be <= 0 (relative to reset time), got {offset}")
        if "{door_time}" in self.status_reason and self.last_door_event_offset_seconds is None:
            raise ValueError("status_reason uses {door_time} but last_door_event_offset_seconds is null")
        if len(set(self.interests)) != len(self.interests):
            raise ValueError("interests must be unique")
        return self


class SeedPreset(_Strict):
    preset_id: str
    text: str


class SeedBuddy(_Strict):
    buddy_id: str
    name: str
    interests: list[LowercaseText] = Field(min_length=1)


class DailySchedule(_Strict):
    repeat: Literal["daily"]
    time: HHMM


class WeeklySchedule(_Strict):
    repeat: Literal["weekly"]
    weekday: Weekday
    time: HHMM


Schedule = Annotated[DailySchedule | WeeklySchedule, Field(discriminator="repeat")]


class SeedActivity(_Strict):
    activity_id: str
    title: str
    schedule: Schedule
    location: str
    near_unit_id: str


class SeedFile(_Strict):
    version: Literal[1]
    responders: SeedResponders
    units: list[SeedUnit] = Field(min_length=1)
    message_presets: list[SeedPreset]
    buddies: list[SeedBuddy]
    community_activities: list[SeedActivity]


def _check_unique(kind: str, ids: list[str]) -> None:
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    if dupes:
        raise SeedError(f"duplicate {kind}: {', '.join(dupes)}")


def validate_seed(seed: SeedFile, controllable_unit_id: str) -> None:
    """Cross-record rules that a per-field model cannot express."""
    unit_ids = [u.unit_id for u in seed.units]
    _check_unique("unit_id", unit_ids)
    _check_unique("preset_id", [p.preset_id for p in seed.message_presets])
    _check_unique("buddy_id", [b.buddy_id for b in seed.buddies])
    _check_unique("activity_id", [a.activity_id for a in seed.community_activities])

    controllable = [u.unit_id for u in seed.units if u.controllable]
    if controllable != [controllable_unit_id]:
        raise SeedError(
            f"exactly one unit must be controllable and it must be CONTROLLABLE_UNIT_ID "
            f"({controllable_unit_id}); seed has controllable units {controllable}"
        )

    for activity in seed.community_activities:
        if activity.near_unit_id not in unit_ids:
            raise SeedError(
                f"activity {activity.activity_id} has unknown near_unit_id {activity.near_unit_id}"
            )


def load_seed(path: Path, controllable_unit_id: str | None = None) -> SeedFile:
    """Read and validate seed.json. Raises SeedError with the file path on any problem."""
    try:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SeedError(f"seed file not found: {path}") from None
    except json.JSONDecodeError as e:
        raise SeedError(f"seed file is not valid JSON: {path}: {e}") from None

    try:
        seed = SeedFile.model_validate(raw)
    except ValidationError as e:
        raise SeedError(f"invalid seed file {path}:\n{e}") from None

    try:
        validate_seed(seed, controllable_unit_id or settings.controllable_unit_id)
    except SeedError as e:
        raise SeedError(f"invalid seed file {path}: {e}") from None
    return seed


def next_occurrence(
    schedule: DailySchedule | WeeklySchedule, now_utc: datetime, tz: str
) -> datetime:
    """Next start of a schedule, in UTC.

    The schedule's time is local time in tz. Today counts if that time is still in the future;
    otherwise the next matching day (tomorrow for daily, the next matching weekday for weekly).
    """
    if now_utc.tzinfo is None:
        raise ValueError("now_utc must be timezone-aware")
    zone = ZoneInfo(tz)
    now_local = now_utc.astimezone(zone)
    hh, mm = (int(part) for part in schedule.time.split(":"))
    at = time(hh, mm)

    if isinstance(schedule, DailySchedule):
        days_ahead = 0
    else:
        days_ahead = (WEEKDAYS.index(schedule.weekday) - now_local.weekday()) % 7

    candidate_date = now_local.date() + timedelta(days=days_ahead)
    candidate = datetime.combine(candidate_date, at, tzinfo=zone)
    if candidate <= now_local:
        step = 1 if isinstance(schedule, DailySchedule) else 7
        candidate = datetime.combine(candidate_date + timedelta(days=step), at, tzinfo=zone)
    return candidate.astimezone(timezone.utc)
