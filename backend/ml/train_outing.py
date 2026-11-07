"""Train the Outing Model for Madam Lee (A-105) and export its learned limits.

Question the model answers:
    "She just tapped out at this time of day. How long is she normally out?"

How it works:
1. Quantile regression (gradient boosting) learns her usual (median) outing length for each
   time of day and day of week. Day of week matters here: Tuesday and Saturday mornings
   (market) run longer than other mornings. (A 95% target, as the Quiet Gap Model uses, can't
   learn this from only ~60 outings: almost none sit above the line to learn from.)
2. Safety margin: extra minutes on top of her usual length, picked on held-back training weeks
   so her normal outings raise at most one "not back yet" every two weeks. Added minutes, not a
   multiplier, so a 40-minute walk still gets room. The test weeks are never used to pick anything.
3. Bounds: never sooner than 30 min, never longer than 6 h.

The result is a table of limits (day of week x 15-minute slot, by tap-out time). That number
is what the rules engine calls `usual_outing_seconds`, so it can replace the typed-in value.

Run from backend/:
    python -m ml.train_outing
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

from ml.common import DAY_NAMES, Rows, Table, export_limits, fit_quantile, lookup, predict_table
from ml.simulate import History, simulate

UNIT_ID = "A-105"
RESIDENT = "Madam Lee Mei Ling"
QUANTILE = 0.5  # her usual outing length
FLOOR_MIN, CEILING_MIN = 30, 6 * 60
TRAIN_DAYS = 42  # first 6 weeks to learn from, last 2 weeks to test on
VALIDATION_WEEKS = [3, 4, 5, 6]  # each one held back in turn (training on the weeks before it)
MARGINS = list(range(0, 181, 5))  # extra minutes on top of her usual length
TARGET_ALERTS_PER_WEEK = 0.5
FIXED_RULES_MIN = {"fixed_2h_rule": 2 * 60, "fixed_3h_rule": 3 * 60}  # "one number for everyone"
MIN_OUTINGS_FOR_CARD = 3  # a tap-out time shows on the caregiver card once she has gone out then this often
MERGE_WITHIN_MIN = 30  # days at the same tap-out time share a card row if her usual lengths are this close
OUT = Path(__file__).resolve().parents[2] / "shared" / "ml" / f"{UNIT_ID}_outing.json"


def outings(h: History) -> Rows:
    """(tap-out time, minutes out) for every outing in the history."""
    return [(out, (back - out).total_seconds() / 60) for out, back in h.outings]


def train(rows: Rows) -> GradientBoostingRegressor:
    # Far fewer outings than water gaps, so much smaller leaves.
    return fit_quantile(rows, QUANTILE, n_estimators=300, learning_rate=0.1, max_depth=3, min_samples_leaf=3)


def finish(raw: Table, margin: float) -> Table:
    return np.clip(raw + margin, FLOOR_MIN, CEILING_MIN)


def _alerts_per_week(table: Table, rows: Rows, days: float) -> float:
    return sum(m > lookup(table, t) for t, m in rows) * 7 / days


def pick_margin(rows: Rows, start: datetime) -> float:
    """Smallest margin that keeps the held-back weeks, on average, under the alert target."""
    folds = []
    for w in VALIDATION_WEEKS:
        lo, hi = start + timedelta(weeks=w - 1), start + timedelta(weeks=w)
        folds.append((predict_table(train([r for r in rows if r[0] < lo])), [r for r in rows if lo <= r[0] < hi]))
    for m in MARGINS:
        if np.mean([_alerts_per_week(finish(raw, m), val, 7) for raw, val in folds]) <= TARGET_ALERTS_PER_WEEK:
            return m
    return MARGINS[-1]


def _kind(t: datetime) -> str:
    """Group outings by when she left, for the report only (the model never sees these labels)."""
    if t.hour < 12:
        return "Tue/Sat morning" if t.weekday() in (1, 5) else "other mornings"
    return "afternoon" if t.hour < 17 else "evening"


def evaluate(table: Table, test_rows: Rows, days: int) -> dict:
    """Compare the model with fixed rules on the 2 weeks it never saw.

    - false alerts: normal outings that ran past the limit
    - if she doesn't come back: how long after her real return time the alert would go out
      (smaller = help comes sooner; negative would mean a false alert, counted above instead)
    """
    rules = {"model": lambda t: lookup(table, t)}
    rules |= {name: (lambda t, m=m: m) for name, m in FIXED_RULES_MIN.items()}
    late = {rule: defaultdict(list) for rule in rules}
    for t, minutes in test_rows:
        for rule, fn in rules.items():
            late[rule][_kind(t)].append(fn(t) - minutes)
    return {
        "test_period_days": days,
        "test_outings": len(test_rows),
        "false_alarms_per_week": {
            rule: round(sum(m > fn(t) for t, m in test_rows) * 7 / days, 1) for rule, fn in rules.items()
        },
        "alert_minutes_after_usual_return_if_not_back": {
            rule: {kind: round(float(np.median(xs))) for kind, xs in sorted(by_kind.items())}
            for rule, by_kind in late.items()
        },
    }


def usual_outings(table: Table, rows: Rows) -> list[dict]:
    """Her regular tap-out times, for the caregiver card: when, which days, usual length, limit.

    Outings are grouped by the nearest half hour she tapped out. Within that, days with a
    similar usual length are merged ("07:00 on Mon, Wed, Thu, Fri, Sun", "07:00 on Tue, Sat").
    Times she rarely goes out are left off.
    """
    by_time: dict[int, dict[int, Rows]] = defaultdict(lambda: defaultdict(list))
    for t, m in rows:
        half_hours = round((t.hour * 60 + t.minute) / 30)  # 06:50 counts as 07:00, 17:38 as 17:30
        by_time[half_hours][t.weekday()].append((t, m))

    out = []
    for half_hours in sorted(by_time):
        days = by_time[half_hours]
        hour, minute = divmod(half_hours * 30, 60)
        if sum(len(items) for items in days.values()) < MIN_OUTINGS_FOR_CARD:
            continue
        usual_on = {d: float(np.median([m for _, m in items])) for d, items in days.items()}
        limit_on = {d: lookup(table, items[0][0].replace(hour=hour, minute=minute)) for d, items in days.items()}
        groups: list[list[int]] = []
        for d in sorted(days, key=lambda d: usual_on[d]):
            if groups and usual_on[d] - usual_on[groups[-1][0]] <= MERGE_WITHIN_MIN:
                groups[-1].append(d)
            else:
                groups.append([d])
        for group in groups:
            items = [r for d in group for r in days[d]]
            limits = [limit_on[d] for d in group]
            out.append({
                "tap_out": f"{hour:02d}:{minute:02d}",
                "days": [DAY_NAMES[d] for d in sorted(group)],
                "outings": len(items),
                "usual_minutes": int(round(float(np.median([m for _, m in items])) / 5) * 5),
                "limit_minutes": [int(round(min(limits) / 5) * 5), int(round(max(limits) / 5) * 5)],
            })
    return out


def main() -> None:
    h = simulate()
    rows = outings(h)
    test_from = h.start + timedelta(days=TRAIN_DAYS)
    train_rows = [r for r in rows if r[0] < test_from]
    test_rows = [r for r in rows if r[0] >= test_from]

    margin = pick_margin(train_rows, h.start)
    table = finish(predict_table(train(train_rows)), margin)
    evaluation = evaluate(table, test_rows, (h.end - test_from).days)
    result = {
        "unit_id": UNIT_ID,
        "resident_name": RESIDENT,
        "source": "simulated_history",
        "model": {
            "name": "Outing Model",
            "type": "Gradient boosting quantile regression (scikit-learn)",
            "quantile": QUANTILE,
            "safety_margin_minutes": margin,
            "bounds_minutes": [FLOOR_MIN, CEILING_MIN],
            "features": ["time of day of card tap-out", "day of week"],
        },
        "trained_on": {"from": h.start.date().isoformat(), "days": TRAIN_DAYS, "outings_used": len(train_rows)},
        "timezone": "Asia/Kuala_Lumpur",
        "slot_minutes": 15,
        "limits_minutes": export_limits(table),  # [day][slot], by tap-out time
        "usual_outings": usual_outings(table, train_rows),
        "evaluation": evaluation,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2) + "\n")

    print(f"{RESIDENT}: {len(train_rows)} outings to learn from, {len(test_rows)} to test on")
    print(f"Safety margin picked on held-back weeks: +{margin} min")
    print("\nHer usual outings (from training data):")
    for o in result["usual_outings"]:
        lo, hi = o["limit_minutes"]
        print(f"  {o['tap_out']} {','.join(o['days']):28} {o['outings']:>3} outings, usually "
              f"{o['usual_minutes'] // 60}h {o['usual_minutes'] % 60:02d}m -> alert after "
              f"{lo // 60}h {lo % 60:02d}m" + (f" to {hi // 60}h {hi % 60:02d}m" if hi != lo else ""))
    print("\nFalse alarms per week (2 test weeks):", evaluation["false_alarms_per_week"])
    print("If she doesn't come back, alert this many minutes after her usual return (median):")
    for rule, by_kind in evaluation["alert_minutes_after_usual_return_if_not_back"].items():
        print(f"  {rule:15} {by_kind}")
    print(f"\nSaved {OUT}")


if __name__ == "__main__":
    main()
