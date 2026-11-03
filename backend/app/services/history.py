"""Caregiver activity history (phase2.md §5): one row per local day with hourly water and
electricity use, door openings, away periods, missing data and alerts.

The prototype has no weeks of meter data, so days before the last demo reset are labelled
simulated history. They are generated on request from the resident's seeded rhythm and are
seeded by unit and date, so a day looks the same on every call. They are never written to
readings, so the rules never see them. From the reset on, days come from real readings, away
periods and incidents. The part of the reset day before the reset has no data, which is also
what Home shows for today.
"""

import random
from dataclasses import dataclass, field, replace
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.db import access_events as db_access
from app.db import away_periods as db_away
from app.db import incidents as db_incidents
from app.db import neighbours as db_neighbours
from app.db import readings as db_readings
from app.db import units as db_units
from app.db.pool import connection
from app.models import (
    HistoryCardTap,
    HistoryDay,
    HistoryHour,
    HistoryIncident,
    HistoryInterval,
    Incident,
    MissingInterval,
    UnitHistory,
)
from app.settings import settings
from app.timeutil import utc_now

Steps = list[tuple[datetime, float]]  # (from, value) changes of a step function, in time order
Window = tuple[datetime, datetime]

# Fixed demo features by days before today, in local minutes from midnight, so the 7- and
# 30-day views always show an away period and a gap in the feed. Day 18-17 is an overnight stay.
_AWAY = {4: [(570, 1140)], 18: [(600, 1440)], 17: [(0, 1080)]}
_OFFLINE = {2: [(60, 240)], 23: [(780, 990)]}


@dataclass
class _Signals:
    water: Steps = field(default_factory=list)  # L/min
    power: Steps = field(default_factory=list)  # kW
    water_initial: float = 0.0
    power_initial: float = 0.0
    door_opened_at: list[datetime] = field(default_factory=list)
    card_taps: list[tuple[datetime, str]] = field(default_factory=list)  # (at, "out" | "in")
    away: list[Window] = field(default_factory=list)
    missing: list[tuple[datetime, datetime, str]] = field(default_factory=list)


def _overlaps(a: Window, b: Window) -> bool:
    return a[0] < b[1] and b[0] < a[1]


def _steps(loads: list[tuple[datetime, datetime, float]], base: float) -> Steps:
    """Overlapping loads (start, end, amount) summed on top of base."""
    deltas: dict[datetime, float] = {}
    for start, end, amount in loads:
        deltas[start] = deltas.get(start, 0) + amount
        deltas[end] = deltas.get(end, 0) - amount
    value, steps = base, []
    for at in sorted(deltas):
        value += deltas[at]
        steps.append((at, round(value, 6)))
    return steps


def _integral(steps: Steps, initial: float, a: datetime, b: datetime) -> float:
    """Integral of the step function over [a, b), in value-hours."""
    total, value, at = 0.0, initial, a
    for t, v in steps:
        if t <= a:
            value = v
            continue
        if t >= b:
            break
        total += value * (t - at).total_seconds()
        value, at = v, t
    return (total + value * (b - at).total_seconds()) / 3600


def _first_positive(steps: Steps, initial: float, parts: list[Window]) -> datetime | None:
    """When the value is first above zero within the parts."""
    for a, b in parts:
        if _value_at(steps, initial, a) > 0:
            return a
        rise = next((t for t, v in steps if a < t < b and v > 0), None)
        if rise:
            return rise
    return None


def _value_at(steps: Steps, initial: float, at: datetime) -> float:
    value = initial
    for t, v in steps:
        if t > at:
            break
        value = v
    return value


def _subtract(window: Window, holes: list[Window]) -> list[Window]:
    parts = [window]
    for hs, he in sorted(holes):
        parts = [p for a, b in parts for p in ((a, min(b, hs)), (max(a, he), b)) if p[0] < p[1]]
    return parts


def _simulated(unit_id: str, day: date, days_ago: int, wake: time, outings: list[tuple[time, time]],
               standby_kw: float, zone: ZoneInfo) -> _Signals:
    rng = random.Random(f"{unit_id}:{day.isoformat()}")
    midnight = datetime.combine(day, time(0), zone)

    def at(minute: int) -> datetime:
        return midnight + timedelta(minutes=max(0, min(1440, minute)))

    away = [(at(a), at(b)) for a, b in _AWAY.get(days_ago, [])]
    outs: list[Window] = []
    for start, end in outings:
        if rng.random() < 0.15:
            continue  # stayed in this morning
        outs.append((at(start.hour * 60 + start.minute + rng.randint(-15, 20)),
                     at(end.hour * 60 + end.minute + rng.randint(-10, 30))))
    if rng.random() < 0.3:
        start = 15 * 60 + rng.randint(0, 60)
        outs.append((at(start), at(start + rng.randint(60, 120))))
    outs = [o for o in outs if not any(_overlaps(o, w) for w in away)]
    not_home = outs + away

    wake_m = wake.hour * 60 + wake.minute + rng.randint(-20, 25)
    water = [(wake_m, rng.randint(7, 9), 7.0), (wake_m + 25 + rng.randint(-5, 5), 3, 5.0),
             (12 * 60 + rng.randint(-30, 30), 4, 5.0), (18 * 60 + 30 + rng.randint(-30, 30), 6, 5.0),
             (21 * 60 + rng.randint(-20, 40), 5, 6.0)]
    water += [(rng.randint(wake_m + 60, 22 * 60), 1, 6.0) for _ in range(rng.randint(4, 6))]
    power = [(wake_m + 10, 4, 1.8), (11 * 60 + 30 + rng.randint(-20, 20), 40, 1.4),
             (18 * 60 + rng.randint(-20, 30), 45, 1.5), (19 * 60 + 15, rng.randint(150, 200), 0.25)]

    def loads(items: list[tuple[int, int, float]]) -> list[tuple[datetime, datetime, float]]:
        spans = [(at(s), at(s + d), v) for s, d, v in items]
        return [(s, e, v) for s, e, v in spans if s < e and not any(_overlaps((s, e), w) for w in not_home)]

    doors = [t for o in outs for t in o]
    doors += [t for w in away for t in w if midnight < t < at(1440)]
    # A card home taps out as she leaves and in as she returns, for the same outings.
    taps = [(t, d) for w in outs + away for t, d in zip(w, ("out", "in")) if midnight < t < at(1440)]
    return _Signals(
        water=_steps(loads(water), 0.0), power=_steps(loads(power), standby_kw), power_initial=standby_kw,
        door_opened_at=sorted(doors), card_taps=sorted(taps), away=away,
        missing=[(at(a), at(b), "feed_offline") for a, b in _OFFLINE.get(days_ago, [])],
    )


def _day(day: date, source: str, signals: _Signals, cover: Window, zone: ZoneInfo,
         incidents: list[Incident], last_water: datetime | None = None) -> HistoryDay:
    start = datetime.combine(day, time(0), zone)
    end = datetime.combine(day + timedelta(days=1), time(0), zone)
    holes = [(a, b) for a, b, _ in signals.missing]
    valid = _subtract(cover, holes) if cover[0] < cover[1] else []

    hours = []
    for h in range(24):
        hs, he = start + timedelta(hours=h), start + timedelta(hours=h + 1)
        parts = [(max(a, hs), min(b, he)) for a, b in valid if a < he and hs < b]
        if not parts:
            hours.append(HistoryHour(hour=h, water_litres=None, energy_kwh=None))
            continue
        litres = sum(_integral(signals.water, signals.water_initial, a, b) for a, b in parts) * 60
        kwh = sum(_integral(signals.power, signals.power_initial, a, b) for a, b in parts)
        hours.append(HistoryHour(hour=h, water_litres=round(litres, 1), energy_kwh=round(kwh, 3)))

    def inside(t: datetime) -> bool:
        return any(a <= t < b for a, b in valid)

    # The unit's last water activity can be seeded without a reading; Home counts it, so do we.
    firsts = [t for t in (_first_positive(signals.water, signals.water_initial, valid), last_water)
              if t is not None and inside(t)]
    return HistoryDay(
        date=day.isoformat(), starts_at=start, ends_at=end, source=source, hours=hours,
        first_water_at=min(firsts, default=None),
        door_opened_at=[t for t in signals.door_opened_at if inside(t)],
        card_taps=[HistoryCardTap(at=t, direction=d) for t, d in signals.card_taps if inside(t)],
        away=[HistoryInterval(starts_at=max(a, start), ends_at=min(b, end)) for a, b in signals.away
              if a < end and start < b],
        missing=[MissingInterval(starts_at=max(a, start), ends_at=min(b, end), reason=r)
                 for a, b, r in signals.missing if a < end and start < b],
        incidents=[HistoryIncident(incident_id=i.incident_id, state=i.state, opened_at=i.opened_at,
                                   closed_at=i.closed_at, outcome=i.outcome)
                   for i in sorted(incidents, key=lambda i: i.opened_at) if start <= i.opened_at < end],
    )  # fmt: skip


async def unit_history(unit_id: str, days: int) -> UnitHistory | None:
    """The last `days` local days for a unit, newest first. None for an unknown unit."""
    unit = await db_units.get_unit(unit_id)
    if unit is None:
        return None
    baseline = unit.baseline
    zone = ZoneInfo(settings.demo_timezone)
    now = utc_now()
    async with connection() as c:
        reset_at = await c.fetchval("select reset_at from demo_resets") or now
        rhythm = next((r for r in await db_neighbours.list_rhythms(c) if r[0] == unit_id), None)
        readings = await db_readings.list_readings(unit_id, conn=c)
        away = await db_away.list_windows(unit_id, conn=c)
        incidents = await db_incidents.list_incidents(unit_id, conn=c)
        taps = await db_access.list_access_events(unit_id, conn=c)
    wake, outings = (rhythm[1], rhythm[2]) if rhythm else (time(7, 0), [])
    standby = baseline.standby_power_kw

    # Readings are sent on change; before the first one the home counts as idle.
    live = _Signals(
        water=[(r.recorded_at, float(r.value)) for r in readings if r.sensor == "water"],
        power=[(r.recorded_at, float(r.value)) for r in readings if r.sensor == "electricity"],
        power_initial=standby,
        door_opened_at=[r.recorded_at for r in readings if r.sensor == "door" and r.value == "open"],
        card_taps=[(e.at, e.direction) for e in taps],
        away=away,
    )
    # Each home has one outing signal: a card home has no door sensor, a door home no card taps.
    card = unit.outing_signal == "card"

    def outing_signal(signals: _Signals) -> _Signals:
        return replace(signals, door_opened_at=[]) if card else replace(signals, card_taps=[])

    today = now.astimezone(zone).date()
    reset_day = reset_at.astimezone(zone).date()
    result = []
    for days_ago in range(days):
        day = today - timedelta(days=days_ago)
        start = datetime.combine(day, time(0), zone)
        end = start + timedelta(days=1)
        if day < reset_day:
            signals = _simulated(unit_id, day, days_ago, wake, outings, standby, zone)
            result.append(_day(day, "simulated_history", outing_signal(signals), (start, end), zone, []))
            continue
        before = [(start, reset_at, "before_demo")] if day == reset_day else []
        signals = outing_signal(replace(live, missing=before))
        result.append(_day(day, "live", signals, (max(start, reset_at), min(end, now)), zone, incidents,
                           unit.quiet_gap.last_water_activity_at))
    return UnitHistory(unit_id=unit_id, standby_power_kw=standby, days=result)
