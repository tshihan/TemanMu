from datetime import datetime
from typing import Any

import asyncpg

from app.db import NotFoundError
from app.db.pool import connection
from app.models import (
    ACTIVE_INCIDENT_STATES,
    Acknowledgement,
    Actor,
    Incident,
    IncidentEvent,
    IncidentEventType,
    IncidentState,
    Outcome,
    Role,
)


class _Unset:
    def __repr__(self) -> str:
        return "UNSET"


UNSET: Any = _Unset()
"""Default for update_incident arguments: leave the column unchanged. None means set NULL."""


async def _load_events(c: asyncpg.Connection, incident_ids: list[str]) -> dict[str, list[IncidentEvent]]:
    rows = await c.fetch(
        """select * from incident_events
            where incident_id = any($1::text[])
            order by at, id""",
        incident_ids,
    )
    events: dict[str, list[IncidentEvent]] = {i: [] for i in incident_ids}
    for r in rows:
        actor = Actor(role=r["actor_role"], name=r["actor_name"]) if r["actor_role"] else None
        events[r["incident_id"]].append(
            IncidentEvent(type=r["type"], at=r["at"], actor=actor, detail=r["detail"])
        )
    return events


async def _to_incidents(c: asyncpg.Connection, rows: list[asyncpg.Record]) -> list[Incident]:
    events = await _load_events(c, [r["incident_id"] for r in rows]) if rows else {}
    return [
        Incident(
            incident_id=r["incident_id"],
            unit_id=r["unit_id"],
            state=r["state"],
            opened_at=r["opened_at"],
            grace_ends_at=r["grace_ends_at"],
            next_reminder_at=r["next_reminder_at"],
            reminder_count=r["reminder_count"],
            acknowledged_by=(
                Acknowledgement(role=r["ack_role"], name=r["ack_name"], at=r["ack_at"])
                if r["ack_role"]
                else None
            ),
            outcome=r["outcome"],
            closed_at=r["closed_at"],
            events=events[r["incident_id"]],
        )
        for r in rows
    ]


async def create_incident(
    unit_id: str,
    opened_at: datetime,
    grace_ends_at: datetime,
    conn: asyncpg.Connection | None = None,
) -> Incident:
    """New incident in state 'grace', with no events yet."""
    async with connection(conn) as c:
        row = await c.fetchrow(
            """insert into incidents (unit_id, state, opened_at, grace_ends_at)
               values ($1, 'grace', $2, $3)
               returning *""",
            unit_id,
            opened_at,
            grace_ends_at,
        )
        return (await _to_incidents(c, [row]))[0]


async def update_incident(
    incident_id: str,
    *,
    state: IncidentState = UNSET,
    grace_ends_at: datetime | None = UNSET,
    next_reminder_at: datetime | None = UNSET,
    reminder_count: int = UNSET,
    ack_role: Role | None = UNSET,
    ack_name: str | None = UNSET,
    ack_at: datetime | None = UNSET,
    outcome: Outcome | None = UNSET,
    closed_at: datetime | None = UNSET,
    conn: asyncpg.Connection | None = None,
) -> Incident:
    """Update the given columns and return the Incident.

    Arguments left out are unchanged. Passing None sets a nullable column to NULL
    (e.g. next_reminder_at=None after acknowledgement). Raises NotFoundError if missing.
    """
    if state is None or reminder_count is None:
        raise ValueError("state and reminder_count cannot be NULL")
    # Column names come from this fixed mapping, never from caller input.
    fields = {
        "state": state,
        "grace_ends_at": grace_ends_at,
        "next_reminder_at": next_reminder_at,
        "reminder_count": reminder_count,
        "ack_role": ack_role,
        "ack_name": ack_name,
        "ack_at": ack_at,
        "outcome": outcome,
        "closed_at": closed_at,
    }
    changes = {k: v for k, v in fields.items() if v is not UNSET}

    async with connection(conn) as c:
        if changes:
            assignments = ", ".join(f"{col} = ${i}" for i, col in enumerate(changes, start=2))
            result = await c.execute(
                f"update incidents set {assignments} where incident_id = $1",
                incident_id,
                *changes.values(),
            )
            if result == "UPDATE 0":
                raise NotFoundError(f"incident {incident_id} not found")
        incident = await get_incident(incident_id, conn=c)
    if incident is None:
        raise NotFoundError(f"incident {incident_id} not found")
    return incident


async def add_incident_event(
    incident_id: str,
    type: IncidentEventType,
    at: datetime,
    actor: Actor | None = None,
    detail: str | None = None,
    conn: asyncpg.Connection | None = None,
) -> Incident:
    """Append a timeline event and return the Incident with all its events."""
    async with connection(conn) as c:
        # Insert only if the incident exists, instead of catching a foreign-key error: an
        # error would abort the caller's whole transaction.
        result = await c.execute(
            """insert into incident_events (incident_id, type, at, actor_role, actor_name, detail)
               select $1, $2, $3, $4, $5, $6
                where exists (select 1 from incidents where incident_id = $1)""",
            incident_id,
            type,
            at,
            actor.role if actor else None,
            actor.name if actor else None,
            detail,
        )
        if result == "INSERT 0 0":
            raise NotFoundError(f"incident {incident_id} not found")
        incident = await get_incident(incident_id, conn=c)
    assert incident is not None
    return incident


async def get_incident(incident_id: str, conn: asyncpg.Connection | None = None) -> Incident | None:
    async with connection(conn) as c:
        row = await c.fetchrow("select * from incidents where incident_id = $1", incident_id)
        return (await _to_incidents(c, [row]))[0] if row else None


async def get_incident_for_update(incident_id: str, conn: asyncpg.Connection) -> Incident | None:
    """Lock the incident row until the caller's transaction ends (SELECT ... FOR UPDATE).

    `conn` is required and must be inside a transaction, so concurrent acknowledge/close
    requests are serialised and the loser sees the updated state (and returns 409).
    """
    if not conn.is_in_transaction():
        raise RuntimeError("get_incident_for_update must be called inside a transaction")
    row = await conn.fetchrow(
        "select * from incidents where incident_id = $1 for update", incident_id
    )
    return (await _to_incidents(conn, [row]))[0] if row else None


async def list_incidents(
    unit_id: str | None = None,
    states: list[IncidentState] | None = None,
    conn: asyncpg.Connection | None = None,
) -> list[Incident]:
    """Incidents, newest first, optionally filtered by unit and/or states."""
    async with connection(conn) as c:
        rows = await c.fetch(
            """select * from incidents
                where ($1::text is null or unit_id = $1)
                  and ($2::text[] is null or state = any($2::text[]))
                order by opened_at desc, incident_id""",
            unit_id,
            list(states) if states is not None else None,
        )
        return await _to_incidents(c, rows)


async def list_active_incidents(conn: asyncpg.Connection | None = None) -> list[Incident]:
    """Incidents in grace/notified/acknowledged, e.g. to restore timers on startup."""
    return await list_incidents(states=list(ACTIVE_INCIDENT_STATES), conn=conn)
