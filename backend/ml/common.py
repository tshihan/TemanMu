"""Pieces shared by the Quiet Gap Model and the Outing Model."""

from __future__ import annotations

from datetime import datetime

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

DAY_NAMES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
SLOT_MIN = 15
SLOTS = 24 * 60 // SLOT_MIN

Rows = list[tuple[datetime, float]]  # (start time, length in minutes)
Table = np.ndarray  # limits in minutes, shape (7 days, SLOTS)


def overlaps(a: datetime, b: datetime, spans: list[tuple[datetime, datetime]]) -> bool:
    return any(s < b and a < e for s, e in spans)


def fit_quantile(rows: Rows, quantile: float, **params) -> GradientBoostingRegressor:
    """Learn, for each time of day and day of week, a length that `quantile` of rows stay under."""
    X = np.array([[t.hour + t.minute / 60, t.weekday()] for t, _ in rows])
    y = np.array([g for _, g in rows])
    model = GradientBoostingRegressor(loss="quantile", alpha=quantile, random_state=0, **params)
    return model.fit(X, y)


def predict_table(model: GradientBoostingRegressor) -> Table:
    """Model prediction at the middle of every slot of the week."""
    hours = (np.arange(SLOTS) + 0.5) * SLOT_MIN / 60
    X = np.array([[hr, d] for d in range(7) for hr in hours])
    return model.predict(X).reshape(7, SLOTS)


def lookup(table: Table, t: datetime) -> float:
    return float(table[t.weekday(), (t.hour * 60 + t.minute) // SLOT_MIN])


def export_limits(table: Table) -> dict[str, list[int]]:
    """limits[day][slot], rounded to 5 minutes. Slot 0 = 00:00-00:15, 1 = 00:15-00:30, ..."""
    return {name: [int(round(v / 5) * 5) for v in table[d]] for d, name in enumerate(DAY_NAMES)}
