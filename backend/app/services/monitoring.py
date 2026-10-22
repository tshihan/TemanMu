"""Monitoring orchestration (Backend 1): readings in, rules applied, state written, events out.

Every state-changing path holds the unit's lock for its whole read-decide-write-broadcast
cycle. Writes happen in one transaction; broadcasts and notifications go out after commit.
Timer callbacks reload state from the database and do nothing unless the expected state
still holds, so a stale or duplicate timer is harmless.
"""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import asyncpg

from app import rules, timers
from app.db import incidents as db_incidents
from app.db import notifications as db_notifications
from app.db import readings as db_readings
from app.db import units as db_units
from app.db.pool import get_pool
from app.models import Actor, Incident, NotificationKind, Reading, ReadingIn, Role, Unit
from app.realtime import broadcast as realtime
from app.rules import reasons
from app.services.notifications import create_notification
from app.settings import settings
from app.timeutil import local_hhmm, utc_now

logger = logging.getLogger(__name__)

BOTH_ROLES: tuple[Role, ...] = ("caregiver", "township")


class MonitoringError(Exception): ...


class UnitNotFound(MonitoringError): ...


class UnitNotControllable(MonitoringError): ...


class IncidentNotFound(MonitoringError): ...


class IncidentConflict(MonitoringError): ...


class NotAcknowledger(MonitoringError): ...


# --- locks -------------------------------------------------------------------------------

# Keyed by event loop too: pytest-asyncio uses a new loop per test, and a lock bound to an
# old loop raises.
_locks: dict[tuple[int, str], asyncio.Lock] = {}


def _unit_lock(unit_id: str) -> asyncio.Lock:
    key = (id(asyncio.get_running_loop()), unit_id)
    lock = _locks.get(key)
    if lock is None:
        lock = _locks[key] = asyncio.Lock()
    return lock


# --- helpers -----------------------------------------------------------------------------


async def _active_incident(unit: Unit, conn: asyncpg.Connection | None = None) -> Incident | None:
    if unit.active_incident_id is None:
        return None
    return await db_incidents.get_incident(unit.active_incident_id, conn=conn)


def _facts(unit: Unit, incident: Incident | None) -> rules.UnitFacts:
    return rules.facts_from(unit, incident.state if incident else None)


def _has_event(incident: Incident, event_type: str) -> bool:
    return any(e.type == event_type for e in incident.events)


def _is_sustained_load_incident(incident: Incident | None) -> bool:
    if incident is None:
        return False
    return any(
        event.type == "detected" and event.detail in (
            reasons.DETECTED_CONTINUOUS_WATER,
            reasons.DETECTED_SUSTAINED_POWER,
        )
        for event in incident.events
    )


async def _notify_both(unit_id: str, kind: NotificationKind, message: str, incident_id: str) -> None:
    for role in BOTH_ROLES:
        await create_notification(role, unit_id, kind, message, incident_id=incident_id)


async def _morning_reassurance_sent(unit_id: str) -> bool:
    today = utc_now().astimezone(ZoneInfo(settings.demo_timezone)).date()
    sent = await db_notifications.list_notifications(role="caregiver")
    return any(n.kind == "morning_reassurance" and n.unit_id == unit_id
               and n.created_at.astimezone(ZoneInfo(settings.demo_timezone)).date() == today for n in sent)


# --- timer keys and scheduling -----------------------------------------------------------


def _watch_key(unit_id: str) -> str:
    return f"watch:{unit_id}"


def _schedule_incident_timer(prefix: str, incident_id: str, at: datetime, step: Callable[[str], Awaitable[None]]) -> None:
    timers.schedule(f"{prefix}:{incident_id}", at, lambda: _run_incident_step(incident_id, step))


async def _run_incident_step(incident_id: str, step: Callable[[str], Awaitable[None]]) -> None:
    """Find the incident's unit, take its lock, then run the step (which reloads the incident)."""
    incident = await db_incidents.get_incident(incident_id)
    if incident is None:  # wiped by a reset
        return
    async with _unit_lock(incident.unit_id):
        await step(incident_id)


# --- watch timer -------------------------------------------------------------------------

# Units whose quiet-gap watch is on. Demo-only: the 3D home turns it on while a scenario plays,
# so A-105 never raises incidents on its own between scenarios. In memory, so a reset or a
# restart turns it off.
_watching: set[str] = set()
_watch_started_at: dict[str, datetime] = {}


def is_watching(unit_id: str) -> bool:
    return unit_id in _watching


async def start_watching(unit_id: str) -> Unit:
    """POST /api/demo/monitoring {active: true}: turn the watch on with a fresh quiet-gap clock.

    The clock restarts now, or an old silence would open an incident the moment it turns on.
    """
    async with _unit_lock(unit_id):
        unit = await db_units.get_unit(unit_id)
        if unit is None:
            raise UnitNotFound(unit_id)
        if not unit.controllable:
            raise UnitNotControllable(unit_id)
        _watching.add(unit_id)
        _watch_started_at[unit_id] = utc_now()
        if unit.active_incident_id is None:
            now = utc_now()
            unit = await db_units.update_unit_state(
                unit_id,
                last_water_activity_at=now,
                status_since=now if unit.status == "possible_away" else None,
            )
            await realtime.broadcast("unit.updated", unit)
        await _arm_watch_locked(unit_id)
        return unit


async def stop_watching(unit_id: str) -> None:
    """POST /api/demo/monitoring {active: false}. Active incidents keep their own timers."""
    async with _unit_lock(unit_id):
        _watching.discard(unit_id)
        _watch_started_at.pop(unit_id, None)
        timers.cancel(_watch_key(unit_id))


def stop_all_watching() -> None:
    """Demo reset: every watch off (reset has already cancelled the timers)."""
    _watching.clear()
    _watch_started_at.clear()


async def _sustained_load_checks(unit: Unit) -> list[tuple[datetime, rules.TickDecision]]:
    """Deadlines for current loads, based on meter transitions, not repeat samples."""
    checks: list[tuple[datetime, rules.TickDecision]] = []
    watch_start = _watch_started_at.get(unit.unit_id)
    if watch_start is None:
        return checks
    if unit.latest.water_lpm > 0:
        started = await db_readings.active_load_started_at(unit.unit_id, "water", 0)
        if started is not None:
            due = max(started, watch_start) + timedelta(seconds=settings.continuous_water_seconds)
            checks.append((due, rules.TickDecision(
                kind="continuous_water",
                reason="Water has continued flowing longer than expected. A check is needed; this may be a tap left on or a leak.",
                detected_detail=reasons.DETECTED_CONTINUOUS_WATER,
            )))
    power_threshold = unit.baseline.standby_power_kw + settings.high_power_above_standby_kw
    if unit.latest.power_kw > power_threshold:
        started = await db_readings.active_load_started_at(unit.unit_id, "electricity", power_threshold)
        if started is not None:
            due = max(started, watch_start) + timedelta(seconds=settings.high_power_seconds)
            checks.append((due, rules.TickDecision(
                kind="sustained_power",
                reason="Electricity use has stayed unusually high. A check is needed; the meter cannot identify the appliance or resident activity.",
                detected_detail=reasons.DETECTED_SUSTAINED_POWER,
            )))
    return checks


async def _next_watch_check(unit: Unit, incident: Incident | None) -> tuple[datetime, rules.TickDecision | None] | None:
    if incident is not None:
        return None
    checks: list[tuple[datetime, rules.TickDecision | None]] = []
    # A running tap is handled by the continuous-flow rule, not "no water use".
    if unit.latest.water_lpm <= 0 or unit.status == "possible_away":
        quiet_due = rules.next_check_at(_facts(unit, incident))
        if quiet_due is not None:
            checks.append((quiet_due, None))
    checks.extend(await _sustained_load_checks(unit))
    return min(checks, key=lambda item: item[0]) if checks else None


async def _arm_watch_locked(unit_id: str) -> None:
    if unit_id not in _watching:
        timers.cancel(_watch_key(unit_id))
        return
    unit = await db_units.get_unit(unit_id)
    if unit is None or not unit.controllable:
        timers.cancel(_watch_key(unit_id))
        return
    next_check = await _next_watch_check(unit, await _active_incident(unit))
    if next_check is None:
        timers.cancel(_watch_key(unit_id))
    else:
        timers.schedule(_watch_key(unit_id), next_check[0], lambda: check_unit(unit_id))


async def arm_watch(unit_id: str) -> None:
    """Schedule (or cancel) watch:{unit} at the time the quiet-gap or outing rule would fire."""
    async with _unit_lock(unit_id):
        await _arm_watch_locked(unit_id)


async def check_unit(unit_id: str) -> None:
    """Watch timer callback: open an incident if the quiet gap or outing has run out."""
    async with _unit_lock(unit_id):
        if unit_id not in _watching:
            return
        unit = await db_units.get_unit(unit_id)
        if unit is None or not unit.controllable:
            return
        now = utc_now()
        incident = await _active_incident(unit)
        next_check = await _next_watch_check(unit, incident)
        if next_check is None or now < next_check[0]:
            await _arm_watch_locked(unit_id)
            return
        decision = next_check[1] or rules.on_tick(_facts(unit, incident), now, local_hhmm)
        if decision is None:
            await _arm_watch_locked(unit_id)  # not due yet (e.g. clock skew): try again later
            return
        await _open_incident(unit, decision, now)


# --- incident lifecycle ------------------------------------------------------------------


async def _open_incident(unit: Unit, decision: rules.TickDecision, now: datetime) -> None:
    grace_ends_at = now + timedelta(seconds=settings.grace_period_seconds)
    async with get_pool().acquire() as conn, conn.transaction():
        incident = await db_incidents.create_incident(unit.unit_id, now, grace_ends_at, conn=conn)
        await db_incidents.add_incident_event(
            incident.incident_id, "detected", now, detail=decision.detected_detail, conn=conn
        )
        incident = await db_incidents.add_incident_event(
            incident.incident_id,
            "voice_call_started",
            now,
            detail=reasons.voice_call_started(unit.caregiver_relationship),
            conn=conn,
        )
        unit = await db_units.update_unit_state(
            unit.unit_id, status="unusual_inactivity", status_reason=decision.reason, status_since=now, conn=conn
        )

    timers.cancel(_watch_key(unit.unit_id))
    _schedule_incident_timer(
        "voice", incident.incident_id, now + timedelta(seconds=settings.voice_call_ring_seconds), _voice_no_answer
    )
    _schedule_incident_timer("grace", incident.incident_id, grace_ends_at, _grace_ended)
    await realtime.broadcast("incident.updated", incident)
    await realtime.broadcast("unit.updated", unit)


async def _voice_no_answer(incident_id: str) -> None:
    incident = await db_incidents.get_incident(incident_id)
    if (
        incident is None
        or incident.state != "grace"
        or _has_event(incident, "voice_call_no_answer")
        or _has_event(incident, "voice_call_cancelled")
    ):
        return
    incident = await db_incidents.add_incident_event(
        incident_id, "voice_call_no_answer", utc_now(), detail=reasons.VOICE_NO_ANSWER
    )
    await realtime.broadcast("incident.updated", incident)


async def _grace_ended(incident_id: str) -> None:
    now = utc_now()
    next_reminder_at = now + timedelta(seconds=settings.reminder_interval_seconds)
    async with get_pool().acquire() as conn, conn.transaction():
        incident = await db_incidents.get_incident_for_update(incident_id, conn)
        if incident is None or incident.state != "grace":
            return
        unit = await db_units.get_unit(incident.unit_id, conn=conn)
        if not _has_event(incident, "voice_call_no_answer"):
            await db_incidents.add_incident_event(
                incident_id, "voice_call_no_answer", now, detail=reasons.VOICE_NO_ANSWER, conn=conn
            )
        await db_incidents.update_incident(
            incident_id, state="notified", grace_ends_at=None, next_reminder_at=next_reminder_at, conn=conn
        )
        incident = await db_incidents.add_incident_event(incident_id, "notified", now, detail=reasons.NOTIFIED, conn=conn)
        unit = await db_units.update_unit_state(
            unit.unit_id,
            status="unresolved_concern",
            status_reason=rules.unresolved_reason(unit.status_reason, unit.caregiver_relationship),
            status_since=now,
            conn=conn,
        )

    timers.cancel(f"voice:{incident_id}")
    _schedule_incident_timer("reminder", incident_id, next_reminder_at, _send_reminder)
    await realtime.broadcast("incident.updated", incident)
    await realtime.broadcast("unit.updated", unit)
    await _notify_both(
        unit.unit_id, "alert", reasons.alert_message(unit.unit_id, unit.resident_name), incident_id
    )


async def _send_reminder(incident_id: str) -> None:
    now = utc_now()
    next_reminder_at = now + timedelta(seconds=settings.reminder_interval_seconds)
    async with get_pool().acquire() as conn, conn.transaction():
        incident = await db_incidents.get_incident_for_update(incident_id, conn)
        if incident is None or incident.state != "notified":
            return
        n = incident.reminder_count + 1
        await db_incidents.update_incident(
            incident_id, reminder_count=n, next_reminder_at=next_reminder_at, conn=conn
        )
        incident = await db_incidents.add_incident_event(
            incident_id, "reminder", now, detail=reasons.reminder_detail(n), conn=conn
        )

    _schedule_incident_timer("reminder", incident_id, next_reminder_at, _send_reminder)
    await realtime.broadcast("incident.updated", incident)
    await _notify_both(incident.unit_id, "reminder", reasons.reminder_message(n, incident.unit_id), incident_id)


async def _auto_resolve(
    conn: asyncpg.Connection, incident: Incident, reading_time: datetime, reason: str | None
) -> Incident:
    """R1, inside ingest_reading's transaction. The unit's own changes come from the rules engine."""
    logger.info("Auto-resolving incident %s: %s", incident.incident_id, reason)
    if incident.state == "grace" and not _has_event(incident, "voice_call_no_answer"):
        await db_incidents.add_incident_event(
            incident.incident_id, "voice_call_cancelled", reading_time, detail=reasons.VOICE_CANCELLED, conn=conn
        )
    await db_incidents.update_incident(
        incident.incident_id,
        state="auto_resolved",
        outcome="resident_activity_detected",
        closed_at=reading_time,
        grace_ends_at=None,
        next_reminder_at=None,
        conn=conn,
    )
    return await db_incidents.add_incident_event(
        incident.incident_id, "auto_resolved", reading_time, detail=reasons.AUTO_RESOLVED, conn=conn
    )


# --- responder actions -------------------------------------------------------------------


async def _incident_unit_id(incident_id: str) -> str:
    incident = await db_incidents.get_incident(incident_id)
    if incident is None:
        raise IncidentNotFound(incident_id)
    return incident.unit_id


async def confirm_home_after_call(unit_id: str, name: str) -> Unit:
    """Record a caregiver's direct verbal confirmation while an outing is only possible."""
    async with _unit_lock(unit_id):
        async with get_pool().acquire() as conn, conn.transaction():
            await conn.fetchrow("select unit_id from units where unit_id = $1 for update", unit_id)
            unit = await db_units.get_unit(unit_id, conn=conn)
            if unit is None:
                raise UnitNotFound(unit_id)
            if name != unit.caregiver_name:
                raise IncidentConflict("Only the designated caregiver can record this confirmation")
            if unit.status != "possible_away" or unit.active_incident_id is not None:
                raise IncidentConflict("Home confirmation is available only while the resident is possibly away")
            confirmed_at = utc_now()
            unit = await db_units.update_unit_state(
                unit_id,
                status="routine",
                status_reason=f"{name} reports speaking directly with {unit.caregiver_relationship}: home and okay; sensor activity has not been confirmed.",
                status_since=confirmed_at,
                last_caregiver_confirmation_at=confirmed_at,
                conn=conn,
            )
        await _arm_watch_locked(unit_id)
        await realtime.broadcast("unit.updated", unit)
        return unit


async def caregiver_response(incident_id: str, name: str, action: str) -> Incident:
    """Log remote caregiver coordination without claiming the in-person welfare check."""
    unit_id = await _incident_unit_id(incident_id)
    async with _unit_lock(unit_id):
        async with get_pool().acquire() as conn, conn.transaction():
            incident = await db_incidents.get_incident_for_update(incident_id, conn)
            if incident is None:
                raise IncidentNotFound(incident_id)
            if incident.state not in ("notified", "acknowledged"):
                raise IncidentConflict("Incident is not awaiting a response")
            if action == "resident_confirmed_safe":
                if incident.state != "notified" or not _has_event(incident, "caregiver_checking_in"):
                    raise IncidentConflict("Speak directly with the resident before confirming safety; an active visit must finish first")
                report = f"{name} reports speaking directly with the resident; no help needed."
                now = utc_now()
                await db_incidents.update_incident(
                    incident_id, state="closed", outcome="resident_ok", report=report, closed_at=now, conn=conn
                )
                incident = await db_incidents.add_incident_event(
                    incident_id, "closed", now, actor=Actor(role="caregiver", name=name), detail="Resident OK", conn=conn
                )
                unit = await db_units.update_unit_state(
                    unit_id, status="routine", status_reason=reasons.closed_reason(name, "resident_ok"),
                    status_since=now, last_water_activity_at=now, conn=conn
                )
            else:
                if _has_event(incident, action):
                    raise IncidentConflict("This caregiver response has already been recorded")
                detail = (
                    "Caregiver is trying to contact the resident; safety is not confirmed."
                    if action == "caregiver_checking_in" else
                    "Caregiver requested a township welfare visit; safety is not confirmed."
                )
                incident = await db_incidents.add_incident_event(
                    incident_id, action, utc_now(), actor=Actor(role="caregiver", name=name), detail=detail, conn=conn
                )
        await realtime.broadcast("incident.updated", incident)
        if action == "resident_confirmed_safe":
            timers.cancel_incident(incident_id)
            await realtime.broadcast("unit.updated", unit)
            await _notify_both(unit_id, "closed", reasons.closed_message("resident_ok"), incident_id)
            return incident
        message = (
            f"{name} is checking in with the resident. Safety is not yet confirmed."
            if action == "caregiver_checking_in" else
            f"{name} requested a township welfare visit."
        )
        await _notify_both(unit_id, action, message, incident_id)
        return incident


async def acknowledge(incident_id: str, role: Role, name: str) -> Incident:
    """POST /api/incidents/{id}/acknowledge: takes a notified visit and stops reminders."""
    if role != "township":
        raise IncidentConflict("Only township can take the in-person visit")
    unit_id = await _incident_unit_id(incident_id)
    async with _unit_lock(unit_id):
        now = utc_now()
        async with get_pool().acquire() as conn, conn.transaction():
            incident = await db_incidents.get_incident_for_update(incident_id, conn)
            if incident is None:
                raise IncidentNotFound(incident_id)
            if incident.state != "notified":
                raise IncidentConflict("Incident is not awaiting a township response")
            await db_incidents.update_incident(
                incident_id,
                state="acknowledged",
                ack_role=role,
                ack_name=name,
                ack_at=now,
                grace_ends_at=None,
                next_reminder_at=None,
                conn=conn,
            )
            incident = await db_incidents.add_incident_event(
                incident_id, "acknowledged", now, actor=Actor(role=role, name=name), conn=conn
            )

        timers.cancel_incident(incident_id)
        await realtime.broadcast("incident.updated", incident)
        await _notify_both(unit_id, "acknowledged", reasons.acknowledged_message(name), incident_id)
        return incident


async def close(incident_id: str, role: Role, name: str, outcome: str, report: str | None = None) -> Incident:
    """POST /api/incidents/{id}/close: only the acknowledger; the unit returns to routine."""
    unit_id = await _incident_unit_id(incident_id)
    async with _unit_lock(unit_id):
        now = utc_now()
        async with get_pool().acquire() as conn, conn.transaction():
            incident = await db_incidents.get_incident_for_update(incident_id, conn)
            if incident is None:
                raise IncidentNotFound(incident_id)
            if incident.state != "acknowledged":
                raise IncidentConflict("Incident must be acknowledged first")
            ack = incident.acknowledged_by
            if ack is None or ack.role != role or ack.name != name:
                raise NotAcknowledger("Only the acknowledger can close this incident")
            if _has_event(incident, "unable_to_verify") and not _has_event(incident, "emergency_called") and outcome != "resident_ok":
                raise IncidentConflict("Record the emergency handoff or confirm the resident is safe before closing")
            await db_incidents.update_incident(incident_id, state="closed", outcome=outcome, report=report, closed_at=now, conn=conn)
            incident = await db_incidents.add_incident_event(
                incident_id,
                "closed",
                now,
                actor=Actor(role=role, name=name),
                detail=reasons.OUTCOME_LABELS[outcome],
                conn=conn,
            )
            # Re-anchor the quiet gap (D2), or the old silence would open a new incident at once.
            unit = await db_units.update_unit_state(
                unit_id,
                status="routine",
                status_reason=reasons.closed_reason(name, outcome),
                status_since=now,
                last_water_activity_at=now,
                conn=conn,
            )

        timers.cancel_incident(incident_id)
        await realtime.broadcast("incident.updated", incident)
        await realtime.broadcast("unit.updated", unit)
        await _notify_both(unit_id, "closed", reasons.closed_message(outcome), incident_id)
        await _arm_watch_locked(unit_id)
        return incident


async def escalate(incident_id: str, role: Role, name: str, action: str) -> Incident:
    """An acknowledged responder records the handoff; no emergency service is contacted here."""
    unit_id = await _incident_unit_id(incident_id)
    async with _unit_lock(unit_id):
        async with get_pool().acquire() as conn, conn.transaction():
            incident = await db_incidents.get_incident_for_update(incident_id, conn)
            if incident is None:
                raise IncidentNotFound(incident_id)
            if incident.state != "acknowledged":
                raise IncidentConflict("A responder must acknowledge this incident first")
            ack = incident.acknowledged_by
            if ack is None or ack.role != role or ack.name != name:
                raise NotAcknowledger("Only the acknowledger can record this handoff")
            if _has_event(incident, action):
                raise IncidentConflict("This handoff has already been recorded")
            if action == "unable_to_verify" and _has_event(incident, "emergency_called"):
                raise IncidentConflict("999 has already been recorded as called")
            detail = (
                "Responder could not verify resident safety; urgent follow-up required."
                if action == "unable_to_verify" else
                "Responder reported calling 999; emergency services have not been confirmed dispatched."
            )
            incident = await db_incidents.add_incident_event(
                incident_id, action, utc_now(), actor=Actor(role=role, name=name), detail=detail, conn=conn
            )
        await realtime.broadcast("incident.updated", incident)
        message = (
            f"{name} could not verify the resident's safety. Urgent follow-up is needed."
            if action == "unable_to_verify" else
            f"{name} reports calling 999. Emergency response is pending confirmation."
        )
        await _notify_both(unit_id, action, message, incident_id)
        return incident


# --- readings ----------------------------------------------------------------------------


async def ingest_reading(body: ReadingIn) -> Unit:
    """POST /api/readings: store the reading, apply the rules, broadcast. Returns the fresh Unit."""
    async with _unit_lock(body.unit_id):
        unit = await db_units.get_unit(body.unit_id)
        if unit is None:
            raise UnitNotFound(body.unit_id)
        if not unit.controllable:
            raise UnitNotControllable(body.unit_id)

        incident = await _active_incident(unit)
        reading = Reading(
            unit_id=body.unit_id,
            sensor=body.sensor,
            value=body.value,
            recorded_at=body.recorded_at or utc_now(),
        )
        decision = rules.on_reading(_facts(unit, incident), reading, local_hhmm)
        emergency_open = incident is not None and (
            _has_event(incident, "unable_to_verify") or _has_event(incident, "emergency_called")
        )
        sustained_open = _is_sustained_load_incident(incident)
        resolving = incident if decision.resolve_incident and not emergency_open and not sustained_open else None

        async with get_pool().acquire() as conn, conn.transaction():
            reading = await db_readings.insert_reading(reading, conn=conn)
            resolved = None
            if resolving is not None:
                resolved = await _auto_resolve(conn, resolving, reading.recorded_at, decision.resolve_reason)
            # After the incident write, so the unit's derived active_incident_id is current.
            changes = decision.changes.as_kwargs()
            if emergency_open or sustained_open:
                # A new utility load cannot certify safety after a sustained-load concern.
                # Preserve the open case while updating its latest meter context.
                for field in ("status", "status_reason", "status_since"):
                    changes.pop(field, None)
            unit = await db_units.update_unit_state(unit.unit_id, **changes, conn=conn)

        if resolved is not None:
            timers.cancel_incident(resolved.incident_id)
        await realtime.broadcast("reading.received", reading)
        if resolved is not None:
            await realtime.broadcast("incident.updated", resolved)
        await realtime.broadcast("unit.updated", unit)

        if resolving is not None:
            # PRD scenario 4: recovery during grace is silent; nobody had been told yet.
            if resolving.state in ("notified", "acknowledged"):
                await _notify_both(
                    unit.unit_id,
                    "auto_resolved",
                    reasons.auto_resolved_message(unit.resident_name),
                    resolving.incident_id,
                )
        elif incident is None and decision.is_activity and not await _morning_reassurance_sent(unit.unit_id):
            await create_notification(
                "caregiver",
                unit.unit_id,
                "morning_reassurance",
                reasons.morning_message(unit.caregiver_relationship, reading.sensor),
            )

        await _arm_watch_locked(unit.unit_id)
        return unit


# --- startup -----------------------------------------------------------------------------


async def restore() -> None:
    """On startup: reschedule timers for active incidents.

    Deadlines that passed while the server was down fire immediately. The quiet-gap watch
    stays off until a scenario turns it on (start_watching).
    """
    for incident in await db_incidents.list_active_incidents():
        unit = await db_units.get_unit(incident.unit_id)
        if unit is None or not unit.controllable:
            continue
        if incident.state == "grace":
            if not _has_event(incident, "voice_call_no_answer"):
                ring_at = incident.opened_at + timedelta(seconds=settings.voice_call_ring_seconds)
                _schedule_incident_timer("voice", incident.incident_id, ring_at, _voice_no_answer)
            if incident.grace_ends_at is not None:
                _schedule_incident_timer("grace", incident.incident_id, incident.grace_ends_at, _grace_ended)
        elif incident.state == "notified" and incident.next_reminder_at is not None:
            _schedule_incident_timer("reminder", incident.incident_id, incident.next_reminder_at, _send_reminder)
        logger.info("Restored timers for %s incident %s", incident.state, incident.incident_id)
