"""Timer registry tests (no database)."""

import asyncio
import logging
from datetime import timedelta

import pytest

from app import timers
from app.timeutil import utc_now


@pytest.fixture(autouse=True)
async def clean_timers():
    await timers.cancel_all()
    yield
    await timers.cancel_all()


def later(seconds: float):
    return utc_now() + timedelta(seconds=seconds)


async def test_callback_runs_at_its_time():
    fired: list[float] = []
    start = asyncio.get_running_loop().time()

    async def cb():
        fired.append(asyncio.get_running_loop().time() - start)

    timers.schedule("watch:A-105", later(0.05), cb)
    assert timers.scheduled_keys() == {"watch:A-105"}
    await asyncio.sleep(0.02)
    assert fired == []
    await asyncio.sleep(0.08)
    assert len(fired) == 1 and fired[0] >= 0.04
    assert timers.scheduled_keys() == set()


async def test_past_deadline_runs_immediately():
    fired = asyncio.Event()

    async def cb():
        fired.set()

    timers.schedule("grace:x", utc_now() - timedelta(seconds=10), cb)
    await asyncio.wait_for(fired.wait(), 0.1)


async def test_reschedule_replaces_old_task():
    calls: list[str] = []

    async def first():
        calls.append("first")

    async def second():
        calls.append("second")

    timers.schedule("watch:A-105", later(0.05), first)
    timers.schedule("watch:A-105", later(0.05), second)
    await asyncio.sleep(0.12)
    assert calls == ["second"]


async def test_self_rescheduling_callback_keeps_running():
    count = 0

    async def tick():
        nonlocal count
        count += 1
        if count < 3:
            timers.schedule("reminder:x", later(0.02), tick)

    timers.schedule("reminder:x", later(0.02), tick)
    await asyncio.sleep(0.2)
    assert count == 3
    assert timers.scheduled_keys() == set()


async def test_cancel_stops_timer():
    calls: list[str] = []

    async def cb():
        calls.append("x")

    timers.schedule("voice:x", later(0.05), cb)
    timers.cancel("voice:x")
    await asyncio.sleep(0.1)
    assert calls == []
    timers.cancel("voice:missing")  # no error


async def test_cancel_incident_only_touches_that_incident():
    calls: list[str] = []

    def cb(name):
        async def run():
            calls.append(name)

        return run

    for key in ("voice:a", "grace:a", "reminder:a", "grace:b", "watch:A-105"):
        timers.schedule(key, later(0.05), cb(key))
    timers.cancel_incident("a")
    assert timers.scheduled_keys() == {"grace:b", "watch:A-105"}
    await asyncio.sleep(0.1)
    assert sorted(calls) == ["grace:b", "watch:A-105"]


async def test_cancel_all_empties_registry():
    calls: list[str] = []

    async def cb():
        calls.append("x")

    for key in ("watch:A-105", "grace:a", "reminder:a"):
        timers.schedule(key, later(0.05), cb)
    await timers.cancel_all()
    assert timers.scheduled_keys() == set()
    await asyncio.sleep(0.1)
    assert calls == []


async def test_exception_is_logged_and_other_timers_still_run(caplog):
    ok = asyncio.Event()

    async def boom():
        raise RuntimeError("boom")

    async def fine():
        ok.set()

    with caplog.at_level(logging.ERROR, logger="app.timers"):
        timers.schedule("grace:bad", later(0.01), boom)
        timers.schedule("grace:good", later(0.03), fine)
        await asyncio.wait_for(ok.wait(), 0.5)
    assert any("grace:bad" in r.getMessage() for r in caplog.records)
    assert timers.scheduled_keys() == set()
