"""Demo reset (B6, B7, PRD §6.5): wipe runtime data and reload shared/seed.json."""

import asyncio
from datetime import datetime, timedelta

from app import timers
from app.db.pool import get_pool
from app.models import Unit
from app.realtime import broadcast as realtime
from app.seed import SeedUnit, load_seed, next_occurrence
from app.services import monitoring
from app.services.snapshot import build_snapshot
from app.settings import settings
from app.timeutil import local_hhmm, utc_now

# One reset at a time within this (single-worker) process.
_reset_lock = asyncio.Lock()


def _at(now: datetime, offset_seconds: int | None) -> datetime | None:
    return None if offset_seconds is None else now + timedelta(seconds=offset_seconds)


def _status_reason(unit: SeedUnit, last_door_event_at: datetime | None) -> str:
    # str.replace, not str.format: reason text may legitimately contain other braces.
    if last_door_event_at is None:
        return unit.status_reason
    return unit.status_reason.replace("{door_time}", local_hhmm(last_door_event_at))


async def reset_demo() -> list[Unit]:
    """Restore the seed state and broadcast a fresh snapshot. Returns the seeded units.

    Raises app.seed.SeedError if seed.json is invalid; the database is then left untouched.
    """
    async with _reset_lock:
        # 1. Stop Backend 1's timers first so none fire mid-reset.
        await timers.cancel_all()
        # 2. Re-read every time, so seed edits apply without a restart. Validate before wiping.
        seed = load_seed(settings.seed_file)
        now = utc_now()

        unit_rows, profile_rows, interest_rows = [], [], []
        for u in seed.units:
            water_at = _at(now, u.last_water_activity_offset_seconds)
            door_at = _at(now, u.last_door_event_offset_seconds)
            unit_rows.append((
                u.unit_id, u.resident_name, u.caregiver_name, u.caregiver_relationship,
                u.controllable, u.status, _status_reason(u, door_at), now, water_at, door_at,
                u.latest.water_lpm, u.latest.power_kw, u.latest.door,
            ))  # fmt: skip
            profile_rows.append((
                u.unit_id, u.baseline.usual_quiet_gap_seconds,
                u.baseline.usual_outing_seconds, u.baseline.standby_power_kw,
            ))  # fmt: skip
            interest_rows.extend((u.unit_id, interest, i) for i, interest in enumerate(u.interests))

        async with get_pool().acquire() as conn, conn.transaction():
            # 3. Wipe runtime data.
            await conn.execute(
                """truncate readings, incident_events, incidents, notifications,
                            community_responses, companion_messages, buddy_matches
                   restart identity cascade"""
            )
            # 4. Wipe and restore seed tables. Truncating (not upserting) means units removed
            #    from seed.json disappear too.
            await conn.execute(
                """truncate resident_interests, resident_profiles, community_activities,
                            buddies, message_presets, units
                   cascade"""
            )
            await conn.executemany(
                """insert into units (unit_id, resident_name, caregiver_name, caregiver_relationship,
                                      controllable, status, status_reason, status_since,
                                      last_water_activity_at, last_door_event_at,
                                      latest_water_lpm, latest_power_kw, latest_door)
                   values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)""",
                unit_rows,
            )
            await conn.executemany(
                """insert into resident_profiles (unit_id, usual_quiet_gap_seconds,
                                                  usual_outing_seconds, standby_power_kw)
                   values ($1, $2, $3, $4)""",
                profile_rows,
            )
            await conn.executemany(
                "insert into resident_interests (unit_id, interest, position) values ($1, $2, $3)",
                interest_rows,
            )
            await conn.executemany(
                "insert into buddies (buddy_id, name, interests) values ($1, $2, $3)",
                [(b.buddy_id, b.name, list(b.interests)) for b in seed.buddies],
            )
            await conn.executemany(
                "insert into message_presets (preset_id, text) values ($1, $2)",
                [(p.preset_id, p.text) for p in seed.message_presets],
            )
            await conn.executemany(
                """insert into community_activities (activity_id, title, starts_at, location, near_unit_id)
                   values ($1, $2, $3, $4, $5)""",
                [
                    (a.activity_id, a.title, next_occurrence(a.schedule, now, settings.demo_timezone),
                     a.location, a.near_unit_id)
                    for a in seed.community_activities
                ],
            )  # fmt: skip

        # 5. After commit, so connected clients never see a half-reset state.
        snapshot = await build_snapshot()
        await realtime.broadcast("snapshot", snapshot)
        # 6. Start the controllable unit's quiet-gap clock (Backend 1).
        await monitoring.arm_watch(settings.controllable_unit_id)
        return snapshot.units
