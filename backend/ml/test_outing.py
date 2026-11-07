"""Run from backend/: python -m pytest ml"""

import json

from ml import train_outing as o
from ml.common import DAY_NAMES, SLOTS


def test_exported_limits():
    o.main()
    data = json.loads(o.OUT.read_text())
    limits = data["limits_minutes"]
    assert set(limits) == set(DAY_NAMES)
    assert all(len(day) == SLOTS for day in limits.values())
    assert all(o.FLOOR_MIN <= m <= o.CEILING_MIN for day in limits.values() for m in day)
    seven = 7 * 60 // data["slot_minutes"]
    assert limits["tue"][seven] > limits["wed"][seven]  # market morning runs longer
    ev = data["evaluation"]["false_alarms_per_week"]
    assert ev["model"] <= ev["fixed_2h_rule"]


def test_usual_outings_summary():
    o.main()
    rows = json.loads(o.OUT.read_text())["usual_outings"]
    assert rows
    for row in rows:
        lo, hi = row["limit_minutes"]
        assert row["outings"] >= o.MIN_OUTINGS_FOR_CARD
        assert row["usual_minutes"] < lo <= hi
