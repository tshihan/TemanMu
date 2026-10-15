import copy
import json
from datetime import datetime, timedelta, timezone

import pytest

from app.seed import DailySchedule, SeedError, WeeklySchedule, load_seed, next_occurrence
from app.settings import settings

KL = "Asia/Kuala_Lumpur"  # UTC+8, no DST
MYT = timezone(timedelta(hours=8))


def kl(*args) -> datetime:
    """A Kuala Lumpur local time, converted to UTC as the function receives it."""
    return datetime(*args, tzinfo=MYT).astimezone(timezone.utc)


# --- the real seed file ---------------------------------------------------------------


def test_real_seed_loads():
    seed = load_seed(settings.seed_file)
    assert [u.unit_id for u in seed.units] == ["A-101", "A-102", "A-103", "A-104", "A-105", "A-106"]
    assert [u.unit_id for u in seed.units if u.controllable] == ["A-105"]


def test_real_seed_matches_prd():
    seed = load_seed(settings.seed_file)
    units = {u.unit_id: u for u in seed.units}

    a105 = units["A-105"]
    assert a105.last_water_activity_offset_seconds == 0
    assert a105.interests == ["gardening", "cooking"]
    assert a105.latest.model_dump() == {"water_lpm": 0, "power_kw": 0.15, "door": "closed"}

    a102 = units["A-102"]
    assert a102.status == "possible_away"
    assert a102.last_door_event_offset_seconds == -600
    assert "{door_time}" in a102.status_reason

    for u in seed.units:
        if not u.controllable:
            assert u.latest.power_kw == u.baseline.standby_power_kw
            assert u.latest.water_lpm == 0

    assert seed.responders.model_dump() == {"caregiver": "Sarah Lee", "township": "Guard Ali"}
    assert [p.preset_id for p in seed.message_presets] == ["p1", "p2", "p3", "p4"]
    assert [b.buddy_id for b in seed.buddies] == ["b1", "b2", "b3"]
    assert [a.activity_id for a in seed.community_activities] == ["c1", "c2", "c3"]


# --- validation -----------------------------------------------------------------------


@pytest.fixture
def raw_seed() -> dict:
    return json.loads(settings.seed_file.read_text())


def write(tmp_path, data) -> str:
    path = tmp_path / "seed.json"
    path.write_text(json.dumps(data))
    return path


def test_duplicate_unit_id_rejected(raw_seed, tmp_path):
    raw_seed["units"].append(copy.deepcopy(raw_seed["units"][0]))
    with pytest.raises(SeedError, match="duplicate unit_id: A-101"):
        load_seed(write(tmp_path, raw_seed))


def test_two_controllable_units_rejected(raw_seed, tmp_path):
    raw_seed["units"][0]["controllable"] = True
    with pytest.raises(SeedError, match="exactly one unit must be controllable"):
        load_seed(write(tmp_path, raw_seed))


def test_controllable_must_match_settings(tmp_path, raw_seed):
    with pytest.raises(SeedError, match="CONTROLLABLE_UNIT_ID"):
        load_seed(write(tmp_path, raw_seed), controllable_unit_id="A-101")


def test_unknown_near_unit_rejected(raw_seed, tmp_path):
    raw_seed["community_activities"][0]["near_unit_id"] = "Z-999"
    with pytest.raises(SeedError, match="unknown near_unit_id Z-999"):
        load_seed(write(tmp_path, raw_seed))


def test_invalid_status_rejected(raw_seed, tmp_path):
    raw_seed["units"][0]["status"] = "sleeping"
    with pytest.raises(SeedError, match="status"):
        load_seed(write(tmp_path, raw_seed))


def test_extra_field_rejected(raw_seed, tmp_path):
    raw_seed["units"][0]["nickname"] = "Ah Kow"
    with pytest.raises(SeedError, match="nickname"):
        load_seed(write(tmp_path, raw_seed))


def test_weekly_without_weekday_rejected(raw_seed, tmp_path):
    del raw_seed["community_activities"][0]["schedule"]["weekday"]
    with pytest.raises(SeedError, match="weekday"):
        load_seed(write(tmp_path, raw_seed))


def test_door_time_needs_door_event(raw_seed, tmp_path):
    raw_seed["units"][1]["last_door_event_offset_seconds"] = None
    with pytest.raises(SeedError, match="door_time"):
        load_seed(write(tmp_path, raw_seed))


def test_uppercase_interest_rejected(raw_seed, tmp_path):
    raw_seed["units"][0]["interests"] = ["Chess"]
    with pytest.raises(SeedError, match="interests"):
        load_seed(write(tmp_path, raw_seed))


def test_missing_file_is_clear(tmp_path):
    with pytest.raises(SeedError, match="seed file not found"):
        load_seed(tmp_path / "nope.json")


# --- next_occurrence ------------------------------------------------------------------
# 2026-10-15 is a Thursday.

DAILY_0730 = DailySchedule(repeat="daily", time="07:30")
SAT_0900 = WeeklySchedule(repeat="weekly", weekday="saturday", time="09:00")
THU_0900 = WeeklySchedule(repeat="weekly", weekday="thursday", time="09:00")


def test_daily_before_time_is_today():
    # 06:00 local is 22:00 UTC the previous day; the answer must still be today local.
    got = next_occurrence(DAILY_0730, kl(2026, 10, 15, 6, 0), KL)
    assert got == kl(2026, 10, 15, 7, 30)
    assert got.tzinfo == timezone.utc


def test_daily_after_time_is_tomorrow():
    assert next_occurrence(DAILY_0730, kl(2026, 10, 15, 8, 0), KL) == kl(2026, 10, 16, 7, 30)


def test_daily_at_exact_time_is_tomorrow():
    assert next_occurrence(DAILY_0730, kl(2026, 10, 15, 7, 30), KL) == kl(2026, 10, 16, 7, 30)


def test_daily_rolls_over_month_and_year():
    assert next_occurrence(DAILY_0730, kl(2026, 12, 31, 20, 0), KL) == kl(2027, 1, 1, 7, 30)


def test_weekly_same_day_before_time_is_today():
    assert next_occurrence(THU_0900, kl(2026, 10, 15, 8, 0), KL) == kl(2026, 10, 15, 9, 0)


def test_weekly_same_day_after_time_is_next_week():
    assert next_occurrence(THU_0900, kl(2026, 10, 15, 10, 0), KL) == kl(2026, 10, 22, 9, 0)


def test_weekly_later_this_week():
    assert next_occurrence(SAT_0900, kl(2026, 10, 15, 12, 0), KL) == kl(2026, 10, 17, 9, 0)


def test_weekly_rolls_over_week_end():
    # Sunday -> the following Saturday
    assert next_occurrence(SAT_0900, kl(2026, 10, 18, 12, 0), KL) == kl(2026, 10, 24, 9, 0)


def test_weekly_uses_local_date_not_utc_date():
    # Saturday 07:00 local is still Friday 23:00 UTC; the session is later today (local).
    assert next_occurrence(SAT_0900, kl(2026, 10, 17, 7, 0), KL) == kl(2026, 10, 17, 9, 0)


def test_naive_now_rejected():
    with pytest.raises(ValueError):
        next_occurrence(DAILY_0730, datetime(2026, 10, 15, 6, 0), KL)
