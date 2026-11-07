"""Run from backend/: python -m pytest ml"""

import json
from datetime import timedelta

from ml import train_quiet_gap as q
from ml.simulate import simulate


def test_history_is_reproducible():
    assert simulate().water == simulate().water


def test_gaps_skip_outings_away_and_missing_data():
    h = simulate()
    rows, dropped = q.gaps(h)
    assert all(dropped.values())
    for start, minutes in rows:
        end = start + timedelta(minutes=minutes)
        assert not q._overlaps(start, end, h.outings + h.away + h.missing)


def test_exported_limits():
    q.main()
    data = json.loads(q.OUT.read_text())
    limits = data["limits_minutes"]
    assert set(limits) == set(q.DAY_NAMES)
    assert all(len(day) == q.SLOTS for day in limits.values())
    assert all(q.FLOOR_MIN <= m <= q.CEILING_MIN for day in limits.values() for m in day)
    slot = lambda hh: hh * 60 // q.SLOT_MIN
    assert limits["mon"][slot(7)] < limits["mon"][slot(23)]  # busy morning is shorter than bedtime
    ev = data["evaluation"]["false_alarms_per_week"]
    assert ev["model"] < ev["fixed_4h_rule"]
