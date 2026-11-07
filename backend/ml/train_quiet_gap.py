"""Train the Quiet Gap Model for Madam Lee (A-105) and export its learned limits.

Question the model answers:
    "She just used water at this time of day. How long can she normally go before the next use?"

How it works:
1. Quantile regression (gradient boosting) learns, for each time of day and day of week, a
   gap length that 95% of her normal gaps stay under.
2. Look-ahead: a quiet spell that starts now could be the start of her nap or bedtime within
   the next hour, so the limit is the largest one over the coming hour.
3. Safety margin: a multiplier picked on held-back training weeks so normal days raise at
   most about one check a week. The test weeks are never used to pick anything.
4. Bounds: never sooner than 45 min, never longer than 9 h.

The result is a table of limits (day of week x 15-minute slot). That number is what the
rules engine calls `usual_quiet_gap_seconds`, so it can replace the typed-in value.

Run from backend/:
    python -m ml.train_quiet_gap
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

from ml.simulate import History, simulate

UNIT_ID = "A-105"
RESIDENT = "Madam Lee Mei Ling"
QUANTILE = 0.95
LOOKAHEAD_MIN = 60
FLOOR_MIN, CEILING_MIN = 45, 9 * 60
SLOT_MIN = 15
SLOTS = 24 * 60 // SLOT_MIN
TRAIN_DAYS = 42  # first 6 weeks to learn from, last 2 weeks to test on
VALIDATION_WEEKS = [3, 4, 5, 6]  # each one held back in turn (training on the weeks before it)
MARGINS = [round(1 + 0.1 * i, 1) for i in range(21)]  # x1.0 .. x3.0
TARGET_CHECKS_PER_WEEK = 1.0
FIXED_RULES_MIN = {"fixed_4h_rule": 4 * 60, "fixed_8h_rule": 8 * 60}  # "one number for everyone"
DAY_NAMES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
OUT = Path(__file__).resolve().parents[2] / "shared" / "ml" / f"{UNIT_ID}_quiet_gap.json"

Rows = list[tuple[datetime, float]]  # (start of gap, gap length in minutes)
Table = np.ndarray  # limits in minutes, shape (7 days, SLOTS)


def _overlaps(a: datetime, b: datetime, spans: list[tuple[datetime, datetime]]) -> bool:
    return any(s < b and a < e for s, e in spans)


def gaps(h: History) -> tuple[Rows, dict[str, int]]:
    """Gaps between water uses she was home for.

    Gaps that cross an outing, an away period or a meter outage are left out: those are not
    'quiet at home' and would teach the model the wrong thing.
    """
    kept, dropped = [], {"outing": 0, "away": 0, "missing_data": 0}
    for a, b in zip(h.water, h.water[1:]):
        if _overlaps(a, b, h.missing):
            dropped["missing_data"] += 1
        elif _overlaps(a, b, h.away):
            dropped["away"] += 1
        elif _overlaps(a, b, h.outings):
            dropped["outing"] += 1
        else:
            kept.append((a, (b - a).total_seconds() / 60))
    return kept, dropped


def train(rows: Rows) -> GradientBoostingRegressor:
    X = np.array([[t.hour + t.minute / 60, t.weekday()] for t, _ in rows])
    y = np.array([g for _, g in rows])
    model = GradientBoostingRegressor(
        loss="quantile", alpha=QUANTILE, n_estimators=300, learning_rate=0.05,
        max_depth=3, min_samples_leaf=25, random_state=0,
    )
    return model.fit(X, y)


def raw_table(model: GradientBoostingRegressor) -> Table:
    """Model prediction at the middle of every slot, with the look-ahead applied."""
    hours = (np.arange(SLOTS) + 0.5) * SLOT_MIN / 60
    X = np.array([[hr, d] for d in range(7) for hr in hours])
    pred = model.predict(X).reshape(7, SLOTS)
    ahead = LOOKAHEAD_MIN // SLOT_MIN
    week = pred.reshape(-1)  # Monday 00:00 .. Sunday 23:45, wrapping round to Monday
    return np.array([
        max(week[(i + k) % week.size] for k in range(ahead + 1)) for i in range(week.size)
    ]).reshape(7, SLOTS)


def finish(raw: Table, margin: float) -> Table:
    return np.clip(raw * margin, FLOOR_MIN, CEILING_MIN)


def lookup(table: Table, t: datetime) -> float:
    return float(table[t.weekday(), (t.hour * 60 + t.minute) // SLOT_MIN])


def _checks_per_week(table: Table, rows: Rows, days: float) -> float:
    return sum(g > lookup(table, t) for t, g in rows) * 7 / days


def pick_margin(rows: Rows, start: datetime) -> float:
    """Smallest margin that keeps each held-back week, on average, to about one check."""
    folds = []
    for w in VALIDATION_WEEKS:
        lo, hi = start + timedelta(weeks=w - 1), start + timedelta(weeks=w)
        folds.append((raw_table(train([r for r in rows if r[0] < lo])), [r for r in rows if lo <= r[0] < hi]))
    for m in MARGINS:
        if np.mean([_checks_per_week(finish(raw, m), val, 7) for raw, val in folds]) <= TARGET_CHECKS_PER_WEEK:
            return m
    return MARGINS[-1]


def evaluate(table: Table, h: History, test_rows: Rows, test_from: datetime) -> dict:
    """Compare the model with fixed rules on the 2 weeks it never saw."""
    days = (h.end - test_from).days
    rules = {"model": lambda t: lookup(table, t)}
    rules |= {name: (lambda t, m=m: m) for name, m in FIXED_RULES_MIN.items()}

    # Simulated falls: at a random moment she stops using water. How long until the alert?
    rng = np.random.default_rng(7)
    blocked = h.outings + h.away + h.missing
    test_water = [t for t in h.water if t >= test_from]
    bands = {"morning (6-12)": (6, 12), "afternoon (12-18)": (12, 18),
             "evening (18-23)": (18, 23), "night (23-6)": (23, 30)}
    delays = {band: {rule: [] for rule in rules} for band in bands}
    for _ in range(4000):
        fall = test_from + timedelta(minutes=float(rng.uniform(0, days * 24 * 60)))
        before = [t for t in test_water if t <= fall]
        if not before or _overlaps(before[-1], fall, blocked):
            continue  # she wasn't at home, or we can't see her
        last = before[-1]
        hr = fall.hour + (24 if fall.hour < 6 else 0)
        band = next(n for n, (lo, hi) in bands.items() if lo <= hr < hi)
        for rule, limit_fn in rules.items():
            alert = last + timedelta(minutes=limit_fn(last))
            delays[band][rule].append(max(0.0, (alert - fall).total_seconds() / 60))

    def summary(xs: list[float]) -> dict:
        return {"falls": len(xs), "median_minutes": round(float(np.median(xs))),
                "worst_10pct_minutes": round(float(np.percentile(xs, 90)))}

    return {
        "test_period_days": days,
        "false_alarms_per_week": {
            rule: round(sum(g > fn(t) for t, g in test_rows) * 7 / days, 1) for rule, fn in rules.items()
        },
        "time_to_alert_after_simulated_fall": {
            band: {rule: summary(xs) for rule, xs in d.items()} for band, d in delays.items()
        },
    }


def export(table: Table, margin: float, n_train: int, dropped: dict, h: History, evaluation: dict) -> dict:
    return {
        "unit_id": UNIT_ID,
        "resident_name": RESIDENT,
        "source": "simulated_history",
        "model": {
            "name": "Quiet Gap Model",
            "type": "Gradient boosting quantile regression (scikit-learn)",
            "quantile": QUANTILE,
            "lookahead_minutes": LOOKAHEAD_MIN,
            "safety_margin": margin,
            "bounds_minutes": [FLOOR_MIN, CEILING_MIN],
            "features": ["time of day of last water use", "day of week"],
        },
        "trained_on": {
            "from": h.start.date().isoformat(),
            "days": TRAIN_DAYS,
            "gaps_used": n_train,
            "gaps_left_out": dropped,
        },
        "timezone": "Asia/Kuala_Lumpur",
        "slot_minutes": SLOT_MIN,
        # limits_minutes[day][slot]: slot 0 = 00:00-00:15, 1 = 00:15-00:30, ... (time of last water use)
        "limits_minutes": {
            name: [int(round(v / 5) * 5) for v in table[d]] for d, name in enumerate(DAY_NAMES)
        },
        "evaluation": evaluation,
    }


def main() -> None:
    h = simulate()
    rows, dropped = gaps(h)
    test_from = h.start + timedelta(days=TRAIN_DAYS)
    train_rows = [r for r in rows if r[0] < test_from]
    test_rows = [r for r in rows if r[0] >= test_from]

    margin = pick_margin(train_rows, h.start)
    table = finish(raw_table(train(train_rows)), margin)
    evaluation = evaluate(table, h, test_rows, test_from)
    result = export(table, margin, len(train_rows), dropped, h, evaluation)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2) + "\n")

    print(f"{RESIDENT}: {len(train_rows)} gaps to learn from, {len(test_rows)} to test on; left out {dropped}")
    print(f"Safety margin picked on held-back weeks: x{margin}")
    print("\nLearned limit (Monday), by time of last water use:")
    for hour in range(24):
        m = result["limits_minutes"]["mon"][hour * 60 // SLOT_MIN]
        print(f"  {hour:02d}:00  {m // 60}h {m % 60:02d}m  {'#' * (m // 15)}")
    print("\nFalse alarms per week (2 test weeks):", evaluation["false_alarms_per_week"])
    print("Time to alert after a simulated fall, minutes (median / worst 10%):")
    print(f"  {'':18}" + "".join(f"{rule:>16}" for rule in evaluation["false_alarms_per_week"]))
    for band, r in evaluation["time_to_alert_after_simulated_fall"].items():
        cells = "".join(f"{str(x['median_minutes']) + ' / ' + str(x['worst_10pct_minutes']):>16}" for x in r.values())
        print(f"  {band:18}{cells}")
    print(f"\nSaved {OUT}")


if __name__ == "__main__":
    main()
