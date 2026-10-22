"""Reason lines, timeline details and notification texts. Pure: no settings, no clock.

Clock times are formatted by a `clock_text` callable passed in by the caller
(`app.timeutil.local_hhmm` in production). Wording matches frontend/src/mocks/api.ts where the
mock has the same message, so mock and live mode look the same.
"""

from collections.abc import Callable
from datetime import datetime

from app.models import Sensor

ClockText = Callable[[datetime], str]

OUTCOME_LABELS: dict[str, str] = {
    "resident_ok": "Resident OK",
    "assistance_provided": "Assistance provided",
    "sent_to_hospital": "Sent to hospital",
    "resident_away": "Resident was away",
}


def format_duration(seconds: float) -> str:
    """M:SS, or H:MM:SS for an hour or more. 34 → "0:34", 3725 → "1:02:05"."""
    total = max(0, int(seconds))
    hours, rest = divmod(total, 3600)
    minutes, secs = divmod(rest, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def format_kw(kw: float) -> str:
    """1.8 → "1.8", 2.0 → "2", 0.15 → "0.15"."""
    return f"{round(kw, 2):g}"


# --- Status reason lines (section 3.5) ---------------------------------------------------


def routine_water() -> str:  # N1
    return "Water activity within usual routine"


def routine_electricity() -> str:  # N2
    return "Water and electricity activity within usual routine"


def door_open_at_home(clock: str, water_on: bool, power_on: bool) -> str:  # N3
    if water_on and power_on:
        signal = "water and electricity were"
    elif water_on:
        signal = "water was"
    else:
        signal = "electricity was"
    return f"Door opened at {clock} while {signal} in use: at home"


def probably_out(clock: str) -> str:  # P1
    return f"Door opened at {clock}, then no water use and electricity back to standby: probably out"


def back_home_door(clock: str) -> str:  # B1
    return f"Door opened at {clock}: back home"


def back_home_activity(door_clock: str | None, sensor: Sensor) -> str:  # B2
    signal = "water" if sensor == "water" else "electricity"
    if door_clock is None:
        return f"{signal.capitalize()} use detected: back home"
    return f"Door opened at {door_clock} and {signal} use detected: back home"


def quiet_gap_reason(
    quiet_seconds: float,
    usual_gap_seconds: int,
    last_door_clock: str | None,
    power_kw: float,
    standby_kw: float,
) -> str:  # U1
    door_part = f"Last door event at {last_door_clock}" if last_door_clock else "No door event"
    power_part = "Electricity at standby" if power_kw <= standby_kw else f"Electricity in use ({format_kw(power_kw)} kW)"
    return (
        f"No water use for {format_duration(quiet_seconds)}, longer than usual maximum of "
        f"{format_duration(usual_gap_seconds)}. {door_part}. {power_part}"
    )


def outing_reason(door_clock: str, away_seconds: float, usual_outing_seconds: int) -> str:  # U2
    return (
        f"Door opened at {door_clock}, then no activity for {format_duration(away_seconds)}, "
        f"longer than usual outing of {format_duration(usual_outing_seconds)}"
    )


def activity_signal(sensor: Sensor, value: float | str) -> str:
    if sensor == "water":
        return "water use"
    if sensor == "electricity":
        return f"electricity use ({format_kw(float(value))} kW)"
    return "door opened"


def resolved_reason(signal: str, during_grace: bool) -> str:  # A1
    if during_grace:
        return f"Resolved: {signal} detected during grace period"
    return f"Resolved: {signal} detected during the check"


def unresolved_reason(current_reason: str, relationship: str) -> str:
    base = current_reason.rstrip()
    if base and not base.endswith("."):
        base += "."
    return f"{base} {relationship} did not answer the simulated call."


def closed_reason(name: str, outcome: str) -> str:
    return f"Incident closed by {name}: {OUTCOME_LABELS[outcome]}"


# --- Timeline event details (section 3.4) ------------------------------------------------

DETECTED_QUIET_GAP = "Water quiet gap exceeded"
DETECTED_OUTING = "Outing longer than usual"
DETECTED_CONTINUOUS_WATER = "Continuous water flow longer than expected"
DETECTED_SUSTAINED_POWER = "Sustained high electricity use"
VOICE_NO_ANSWER = "No answer (simulated)"
VOICE_CANCELLED = "simulated"
NOTIFIED = "Caregiver and township notified together"
AUTO_RESOLVED = "Resident activity detected"


def voice_call_started(relationship: str) -> str:
    return f"Calling {relationship} (simulated)"


def reminder_detail(n: int) -> str:
    return f"Reminder #{n}"


# --- Notification messages (section 3.4) -------------------------------------------------


def morning_message(relationship: str, sensor: Sensor) -> str:
    action = {
        "door": "Front door opened at home.",
        "water": "Water used at home.",
        "electricity": "Electricity used at home.",
    }[sensor]
    return f"{relationship}'s day has started. {action}"


def alert_message(unit_id: str, resident_name: str) -> str:
    return f"Unresolved concern at {unit_id}: {resident_name} could not be reached."


def reminder_message(n: int, unit_id: str) -> str:
    return f"Reminder #{n}: concern at {unit_id} still needs a response."


def acknowledged_message(name: str) -> str:
    return f"{name} is checking now."


def closed_message(outcome: str) -> str:
    return f"Incident closed: {OUTCOME_LABELS[outcome]}."


def auto_resolved_message(resident_name: str) -> str:
    return f"{resident_name} activity detected. Concern resolved."
