"""Backend watch decisions for persistent utility loads (no database needed)."""

from datetime import datetime, timedelta, timezone

import pytest

from app.models import Baseline, QuietGap, Unit, UnitLatest
from app.services import monitoring
from app.settings import settings

T0 = datetime(2026, 10, 22, tzinfo=timezone.utc)


def unit(water: float, power: float) -> Unit:
    return Unit(
        unit_id="A-105", resident_name="Mdm Tan", caregiver_name="Mei",
        caregiver_relationship="Mum", controllable=True, status="routine",
        status_reason="", status_since=T0,
        latest=UnitLatest(water_lpm=water, power_kw=power, door="closed", last_door_event_at=None),
        quiet_gap=QuietGap(last_water_activity_at=T0, usual_max_seconds=30),
        baseline=Baseline(usual_quiet_gap_seconds=30, usual_outing_seconds=45, standby_power_kw=0.15),
        active_incident_id=None,
    )


@pytest.mark.asyncio
async def test_running_water_uses_sustained_load_deadline_not_quiet_gap(monkeypatch):
    async def started(_unit_id, sensor, _threshold):
        return T0 if sensor == "water" else None

    monkeypatch.setattr(monitoring.db_readings, "active_load_started_at", started)
    monkeypatch.setitem(monitoring._watch_started_at, "A-105", T0)
    next_check = await monitoring._next_watch_check(unit(6, 0.15), None)
    assert next_check is not None
    assert next_check[0] == T0 + timedelta(seconds=settings.continuous_water_seconds)
    assert next_check[1].kind == "continuous_water"
    monitoring._watch_started_at.pop("A-105", None)


@pytest.mark.asyncio
async def test_high_power_only_above_large_load_threshold(monkeypatch):
    async def started(_unit_id, sensor, _threshold):
        return T0 if sensor == "electricity" else None

    monkeypatch.setattr(monitoring.db_readings, "active_load_started_at", started)
    monkeypatch.setitem(monitoring._watch_started_at, "A-105", T0)
    checks = await monitoring._sustained_load_checks(unit(0, 1.8))
    assert len(checks) == 1
    assert checks[0][1].kind == "sustained_power"
    assert checks[0][0] == T0 + timedelta(seconds=settings.high_power_seconds)
    assert await monitoring._sustained_load_checks(unit(0, 0.27)) == []
    monitoring._watch_started_at.pop("A-105", None)
