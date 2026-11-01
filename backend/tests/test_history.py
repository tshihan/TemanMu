"""Caregiver activity history (phase2.md §5). The generator tests need no database; the API
tests run against TEST_DATABASE_URL like test_api.py."""

import os
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest
from httpx import ASGITransport, AsyncClient

from app.db import readings
from app.main import app
from app.models import Reading, UnitHistory
from app.services import history
from app.timeutil import utc_now

ZONE = ZoneInfo("Asia/Kuala_Lumpur")
needs_db = pytest.mark.skipif(
    not os.environ.get("TEST_DATABASE_URL"),
    reason="set TEST_DATABASE_URL to a separate Postgres to run database tests (never the demo database)",
)


def simulated_day(days_ago: int, day: date = date(2026, 11, 1)):
    d = day - timedelta(days=days_ago)
    signals = history._simulated("A-105", d, days_ago, time(6), [(time(7), time(8, 15))], 0.15, ZONE)
    start = datetime.combine(d, time(0), ZONE)
    return history._day(d, "simulated_history", signals, (start, start + timedelta(days=1)), ZONE, [])


def test_simulated_day_is_the_same_on_every_call():
    assert simulated_day(1) == simulated_day(1)
    assert simulated_day(1) != simulated_day(3)


def test_simulated_day_has_24_hours_and_standby_power_overnight():
    day = simulated_day(1)
    assert [h.hour for h in day.hours] == list(range(24))
    assert day.hours[2].water_litres == 0 and day.hours[2].energy_kwh == pytest.approx(0.15)
    assert day.first_water_at is not None


def test_offline_feed_hours_have_no_data():
    day = simulated_day(2)
    assert [m.reason for m in day.missing] == ["feed_offline"]
    assert [h.hour for h in day.hours if h.water_litres is None] == [1, 2, 3]


def test_no_water_used_while_away():
    day = simulated_day(4)
    (away,) = day.away
    assert away.starts_at.astimezone(ZONE).strftime("%H:%M") == "09:30"
    assert all(h.water_litres == 0 for h in day.hours if 10 <= h.hour < 19)


def test_integral_handles_steps_inside_and_outside_the_window():
    t0 = datetime(2026, 11, 1, tzinfo=ZONE)
    steps = [(t0 - timedelta(hours=1), 2.0), (t0 + timedelta(minutes=30), 0.0)]
    assert history._integral(steps, 0.0, t0, t0 + timedelta(hours=1)) == pytest.approx(1.0)


async def test_days_query_accepts_7_and_30_only(monkeypatch):
    # Query values arrive as strings; this ran into a Literal that never matched "7".
    async def fake(unit_id, days):
        return UnitHistory(unit_id=unit_id, standby_power_kw=0.15, days=[])

    monkeypatch.setattr(history, "unit_history", fake)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        assert (await c.get("/api/units/A-105/history?days=7")).status_code == 200
        assert (await c.get("/api/units/A-105/history?days=30")).status_code == 200
        assert (await c.get("/api/units/A-105/history")).status_code == 200
        assert (await c.get("/api/units/A-105/history?days=14")).status_code == 422
        assert (await c.get("/api/units/A-105/history?days=abc")).status_code == 422


@needs_db
async def test_history_shows_live_today_and_simulated_days_before(client):
    now = utc_now()
    await readings.insert_reading(Reading(unit_id="A-105", sensor="water", value=6.0, recorded_at=now))
    await readings.insert_reading(
        Reading(unit_id="A-105", sensor="water", value=0.0, recorded_at=now + timedelta(seconds=1))
    )
    r = await client.get("/api/units/A-105/history?days=7")
    assert r.status_code == 200
    got = UnitHistory.model_validate(r.json())
    assert len(got.days) == 7
    today, *before = got.days
    assert today.source == "live" and today.missing[0].reason == "before_demo"
    assert today.first_water_at is not None
    assert all(day.source == "simulated_history" for day in before)
    assert sum(h.water_litres or 0 for h in today.hours) == pytest.approx(0.1)


@needs_db
async def test_history_rejects_other_ranges_and_unknown_units(client):
    assert (await client.get("/api/units/A-105/history?days=14")).status_code == 422
    assert (await client.get("/api/units/NOPE/history")).status_code == 404
