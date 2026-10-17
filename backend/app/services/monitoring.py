"""Monitoring orchestration (Backend 1): readings in, rules applied, state written, events out.

Every state-changing path holds the unit's lock for its whole read-decide-write-broadcast
cycle. Writes happen in one transaction; broadcasts and notifications go out after commit.
"""

import asyncio
import logging

from app import rules, timers
from app.db import incidents as db_incidents
from app.db import notifications as db_notifications
from app.db import readings as db_readings
from app.db import units as db_units
from app.db.pool import get_pool
from app.models import Incident, Reading, ReadingIn, Unit
from app.realtime import broadcast as realtime
from app.rules import reasons
from app.services.notifications import create_notification
from app.timeutil import local_hhmm, utc_now

logger = logging.getLogger(__name__)


class MonitoringError(Exception): ...


class UnitNotFound(MonitoringError): ...


class UnitNotControllable(MonitoringError): ...


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


async def _active_incident(unit: Unit, conn=None) -> Incident | None:
    if unit.active_incident_id is None:
        return None
    return await db_incidents.get_incident(unit.active_incident_id, conn=conn)


async def _morning_reassurance_sent(unit_id: str) -> bool:
    # Reset truncates notifications, so any morning_reassurance was sent since the last reset.
    sent = await db_notifications.list_notifications(role="caregiver")
    return any(n.kind == "morning_reassurance" and n.unit_id == unit_id for n in sent)


# --- watch timer -------------------------------------------------------------------------


def _watch_key(unit_id: str) -> str:
    return f"watch:{unit_id}"


async def _arm_watch_locked(unit_id: str) -> None:
    unit = await db_units.get_unit(unit_id)
    if unit is None or not unit.controllable:
        timers.cancel(_watch_key(unit_id))
        return
    incident = await _active_incident(unit)
    due = rules.next_check_at(rules.facts_from(unit, incident.state if incident else None))
    if due is None:
        timers.cancel(_watch_key(unit_id))
    else:
        timers.schedule(_watch_key(unit_id), due, lambda: check_unit(unit_id))


async def arm_watch(unit_id: str) -> None:
    """Schedule (or cancel) watch:{unit} at the time the quiet-gap or outing rule would fire."""
    async with _unit_lock(unit_id):
        await _arm_watch_locked(unit_id)


async def check_unit(unit_id: str) -> None:
    """Watch timer callback. Step 4: only logs what on_tick decides; incidents come in step 5."""
    async with _unit_lock(unit_id):
        unit = await db_units.get_unit(unit_id)
        if unit is None or not unit.controllable:
            return
        incident = await _active_incident(unit)
        decision = rules.on_tick(rules.facts_from(unit, incident.state if incident else None), utc_now(), local_hhmm)
        if decision is not None:
            logger.info("%s: would open %s incident: %s", unit_id, decision.kind, decision.reason)


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
        decision = rules.on_reading(rules.facts_from(unit, incident.state if incident else None), reading, local_hhmm)

        async with get_pool().acquire() as conn, conn.transaction():
            reading = await db_readings.insert_reading(reading, conn=conn)
            unit = await db_units.update_unit_state(unit.unit_id, **decision.changes.as_kwargs(), conn=conn)

        await realtime.broadcast("reading.received", reading)
        await realtime.broadcast("unit.updated", unit)

        if (
            decision.is_activity
            and not decision.resolve_incident
            and not await _morning_reassurance_sent(unit.unit_id)
        ):
            await create_notification(
                "caregiver",
                unit.unit_id,
                "morning_reassurance",
                reasons.morning_message(unit.caregiver_relationship),
            )

        await _arm_watch_locked(unit.unit_id)
        return unit
