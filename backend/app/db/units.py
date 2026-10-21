from datetime import datetime

import asyncpg

from app.db import NotFoundError
from app.db.pool import connection
from app.models import Baseline, DoorState, QuietGap, Status, Unit, UnitLatest

_UNIT_SELECT = """
select u.*,
       p.usual_quiet_gap_seconds, p.usual_outing_seconds, p.standby_power_kw,
       (select i.incident_id from incidents i
         where i.unit_id = u.unit_id and i.state in ('grace','notified','acknowledged')
         order by i.opened_at desc limit 1) as active_incident_id
  from units u
  join resident_profiles p on p.unit_id = u.unit_id
"""


def _row_to_baseline(row: asyncpg.Record) -> Baseline:
    return Baseline(
        usual_quiet_gap_seconds=row["usual_quiet_gap_seconds"],
        usual_outing_seconds=row["usual_outing_seconds"],
        standby_power_kw=row["standby_power_kw"],
    )


def _row_to_unit(row: asyncpg.Record) -> Unit:
    baseline = _row_to_baseline(row)
    return Unit(
        unit_id=row["unit_id"],
        resident_name=row["resident_name"],
        caregiver_name=row["caregiver_name"],
        caregiver_relationship=row["caregiver_relationship"],
        controllable=row["controllable"],
        status=row["status"],
        status_reason=row["status_reason"],
        status_since=row["status_since"],
        latest=UnitLatest(
            water_lpm=row["latest_water_lpm"],
            power_kw=row["latest_power_kw"],
            door=row["latest_door"],
            last_door_event_at=row["last_door_event_at"],
        ),
        quiet_gap=QuietGap(
            last_water_activity_at=row["last_water_activity_at"],
            last_caregiver_confirmation_at=row["last_caregiver_confirmation_at"],
            usual_max_seconds=baseline.usual_quiet_gap_seconds,
        ),
        baseline=baseline,
        active_incident_id=row["active_incident_id"],
    )


async def list_units(conn: asyncpg.Connection | None = None) -> list[Unit]:
    """All units, sorted by unit_id."""
    async with connection(conn) as c:
        rows = await c.fetch(_UNIT_SELECT + " order by u.unit_id")
    return [_row_to_unit(r) for r in rows]


async def get_unit(unit_id: str, conn: asyncpg.Connection | None = None) -> Unit | None:
    async with connection(conn) as c:
        row = await c.fetchrow(_UNIT_SELECT + " where u.unit_id = $1", unit_id)
    return _row_to_unit(row) if row else None


async def unit_exists(unit_id: str, conn: asyncpg.Connection | None = None) -> bool:
    async with connection(conn) as c:
        return await c.fetchval("select exists (select 1 from units where unit_id = $1)", unit_id)


async def get_baseline(unit_id: str, conn: asyncpg.Connection | None = None) -> Baseline | None:
    async with connection(conn) as c:
        row = await c.fetchrow("select * from resident_profiles where unit_id = $1", unit_id)
    return _row_to_baseline(row) if row else None


async def update_unit_state(
    unit_id: str,
    *,
    status: Status | None = None,
    status_reason: str | None = None,
    status_since: datetime | None = None,
    last_water_activity_at: datetime | None = None,
    last_caregiver_confirmation_at: datetime | None = None,
    last_door_event_at: datetime | None = None,
    latest_water_lpm: float | None = None,
    latest_power_kw: float | None = None,
    latest_door: DoorState | None = None,
    conn: asyncpg.Connection | None = None,
) -> Unit:
    """Update only the fields that are not None, and return the updated Unit.

    Raises NotFoundError if the unit does not exist.
    """
    # Column names come from this fixed mapping, never from caller input.
    fields = {
        "status": status,
        "status_reason": status_reason,
        "status_since": status_since,
        "last_water_activity_at": last_water_activity_at,
        "last_caregiver_confirmation_at": last_caregiver_confirmation_at,
        "last_door_event_at": last_door_event_at,
        "latest_water_lpm": latest_water_lpm,
        "latest_power_kw": latest_power_kw,
        "latest_door": latest_door,
    }
    changes = {k: v for k, v in fields.items() if v is not None}

    async with connection(conn) as c:
        if changes:
            assignments = ", ".join(f"{col} = ${i}" for i, col in enumerate(changes, start=2))
            result = await c.execute(
                f"update units set {assignments} where unit_id = $1", unit_id, *changes.values()
            )
            if result == "UPDATE 0":
                raise NotFoundError(f"unit {unit_id} not found")
        unit = await get_unit(unit_id, conn=c)
    if unit is None:
        raise NotFoundError(f"unit {unit_id} not found")
    return unit
