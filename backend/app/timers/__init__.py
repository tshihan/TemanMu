"""Keyed asyncio timers. Owned by Backend 1.

Keys: watch:{unit_id}, voice:{incident_id}, grace:{incident_id}, reminder:{incident_id}.
Each entry is a task that sleeps until its deadline and then awaits the callback. Callback
exceptions are logged, never propagated. Timers live in this process: run uvicorn with one worker.
"""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import datetime

from app.timeutil import utc_now

logger = logging.getLogger(__name__)

INCIDENT_TIMER_PREFIXES = ("voice", "grace", "reminder")

_tasks: dict[str, asyncio.Task] = {}


def _current_task() -> asyncio.Task | None:
    try:
        return asyncio.current_task()
    except RuntimeError:  # no running loop
        return None


async def _run(key: str, at: datetime, callback: Callable[[], Awaitable[None]]) -> None:
    try:
        await asyncio.sleep(max(0.0, (at - utc_now()).total_seconds()))
        await callback()
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.exception("Timer %s failed", key)
    finally:
        # Only remove our own entry: the callback may have rescheduled this key.
        if _tasks.get(key) is _current_task():
            del _tasks[key]


def schedule(key: str, at: datetime, callback: Callable[[], Awaitable[None]]) -> None:
    """Run callback at `at` (immediately if in the past). Replaces any timer with the same key."""
    old = _tasks.get(key)
    # A callback rescheduling its own key must not cancel itself.
    if old is not None and old is not _current_task():
        old.cancel()
    _tasks[key] = asyncio.create_task(_run(key, at, callback), name=f"timer:{key}")


def cancel(key: str) -> None:
    task = _tasks.pop(key, None)
    if task is not None and task is not _current_task():
        task.cancel()


def cancel_incident(incident_id: str) -> None:
    """Cancel the voice, grace and reminder timers of one incident."""
    for prefix in INCIDENT_TIMER_PREFIXES:
        cancel(f"{prefix}:{incident_id}")


async def cancel_all() -> None:
    """Cancel every timer and wait for them to finish. Called by demo reset and on shutdown."""
    current = _current_task()
    tasks = [task for task in _tasks.values() if task is not current]
    _tasks.clear()
    for task in tasks:
        task.cancel()
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    # Tasks from another (closed) event loop cannot be awaited here.
    same_loop = [task for task in tasks if task.get_loop() is loop]
    await asyncio.gather(*same_loop, return_exceptions=True)


def scheduled_keys() -> set[str]:
    """Keys with a pending timer (for tests and debugging)."""
    return {key for key, task in _tasks.items() if not task.done()}
