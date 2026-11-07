"""Simulated water history for Madam Lee (A-105), in real hours.

This is made-up but believable data for the prototype. It is never measured resident data.
Her day follows the seed rhythm (wake 06:00, morning outing 07:00-08:15) plus gardening,
meals, an afternoon nap and the odd night-time toilet visit.

Besides water uses, the history also records the periods the model must not learn from:
- outings (card tap out -> tap in): the outing rule covers these, not the quiet gap
- away periods (e.g. staying with her daughter): known absences
- missing data (meter feed down): we can't tell quiet from missing, so these are left out
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

import numpy as np

START_DATE = date(2026, 8, 3)  # a Monday
DAYS = 56  # 8 weeks


@dataclass
class History:
    water: list[datetime] = field(default_factory=list)
    outings: list[tuple[datetime, datetime]] = field(default_factory=list)
    away: list[tuple[datetime, datetime]] = field(default_factory=list)
    missing: list[tuple[datetime, datetime]] = field(default_factory=list)
    start: datetime | None = None
    end: datetime | None = None


def _at(day: date, hour: float) -> datetime:
    return datetime.combine(day, datetime.min.time()) + timedelta(hours=hour)


def _jitter(rng: np.random.Generator, minutes: float) -> float:
    """A random shift in hours, roughly within +/- `minutes`."""
    return rng.normal(0, minutes / 2) / 60


def _uses(rng: np.random.Generator, start: datetime, end: datetime, mean_gap_min: float) -> list[datetime]:
    """Water uses scattered through a block, on average `mean_gap_min` apart."""
    out, t = [], start
    while True:
        t += timedelta(minutes=float(rng.gamma(2.0, mean_gap_min / 2)))
        if t >= end:
            return out
        out.append(t)


def _one_day(rng: np.random.Generator, day: date, h: History) -> None:
    wake = 6.0 + _jitter(rng, 20)
    bed = 22.5 + _jitter(rng, 30)
    w = h.water

    # Night-time toilet visit, some nights.
    if rng.random() < 0.35:
        w.append(_at(day, 2.5 + rng.random() * 1.5))

    # Wake up: toilet, wash, kettle.
    w += [_at(day, wake), _at(day, wake + 0.1 + rng.random() * 0.1)]
    w += _uses(rng, _at(day, wake + 0.25), _at(day, 6.9), 15)

    # Morning outing on most days (market / exercise), by access card.
    if rng.random() < 0.85:
        out_t = _at(day, 7.0 + _jitter(rng, 15))
        back_t = _at(day, 8.25 + _jitter(rng, 30))
        h.outings.append((out_t, back_t))
        home_from = back_t
    else:
        home_from = _at(day, 7.0)
        w += _uses(rng, home_from, _at(day, 8.25), 40)
        home_from = _at(day, 8.25)

    # Breakfast, then gardening (watering plants).
    w.append(home_from + timedelta(minutes=5 + rng.random() * 10))
    w += _uses(rng, home_from + timedelta(minutes=15), _at(day, 9.0), 15)
    w += _uses(rng, _at(day, 9.0), _at(day, 11.0), 35)

    # Lunch cooking and washing up.
    w += _uses(rng, _at(day, 11.3 + _jitter(rng, 15)), _at(day, 13.2), 15)

    # Afternoon nap: no water. Toilet when she wakes.
    nap_end = 15.75 + _jitter(rng, 30)
    w.append(_at(day, nap_end))

    # Late afternoon: occasional use (tea, watering again).
    w += _uses(rng, _at(day, nap_end + 0.2), _at(day, 18.0), 60)

    # Dinner and washing up.
    w += _uses(rng, _at(day, 18.0), _at(day, 20.0), 15)

    # Evening: bath and the odd use before bed.
    w.append(_at(day, 21.0 + _jitter(rng, 30)))
    w += _uses(rng, _at(day, 20.0), _at(day, bed), 50)
    w.append(_at(day, bed))  # last toilet visit before bed


def simulate(days: int = DAYS, seed: int = 105) -> History:
    """Madam Lee's water history. The same seed always gives the same history."""
    rng = np.random.default_rng(seed)
    h = History(start=_at(START_DATE, 0), end=_at(START_DATE + timedelta(days=days), 0))

    # Two nights staying with her daughter Sarah (weekend of week 4).
    away_from = _at(START_DATE + timedelta(days=26), 10.0)
    away_to = _at(START_DATE + timedelta(days=28), 17.0)
    h.away.append((away_from, away_to))

    # Two meter-feed outages of a few hours each.
    for d, hour, hours in ((12, 9.5, 5.0), (41, 14.0, 6.0)):
        s = _at(START_DATE + timedelta(days=d), hour)
        h.missing.append((s, s + timedelta(hours=hours)))

    for i in range(days):
        _one_day(rng, START_DATE + timedelta(days=i), h)

    def blocked(t: datetime) -> bool:
        spans = h.away + h.missing + h.outings
        return any(s <= t < e for s, e in spans)

    h.water = sorted(t for t in h.water if not blocked(t))
    return h
