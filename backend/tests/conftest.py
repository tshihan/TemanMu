import asyncio
import os
from pathlib import Path

import pytest
from dotenv import dotenv_values

# Database tests run against TEST_DATABASE_URL only; they call demo reset, which wipes data.
# Settings read DATABASE_URL at import time, so point it at the test database (or a placeholder)
# before anything imports app.settings. Environment variables override backend/.env.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
_demo_url = dotenv_values(Path(__file__).resolve().parent.parent / ".env").get("DATABASE_URL")
if TEST_DATABASE_URL and TEST_DATABASE_URL == _demo_url:
    raise pytest.UsageError("TEST_DATABASE_URL is the demo DATABASE_URL. Tests would wipe the demo.")
os.environ["DATABASE_URL"] = TEST_DATABASE_URL or "postgresql://tests-must-not-use-demo-db@invalid/none"

from httpx import ASGITransport, AsyncClient  # noqa: E402

from app import timers  # noqa: E402
from app.db import pool  # noqa: E402
from app.db.migrate import apply_migrations  # noqa: E402
from app.main import app  # noqa: E402
from app.realtime import broadcast as realtime  # noqa: E402
from app.services.reset import reset_demo  # noqa: E402

@pytest.fixture(scope="session")
def migrated() -> None:
    """Apply migrations once per test session."""
    asyncio.run(apply_migrations(TEST_DATABASE_URL))


@pytest.fixture
def broadcasts(monkeypatch) -> list[tuple[str, object]]:
    """Replace Backend 1's broadcast with a recorder: a list of (event_type, data)."""
    events: list[tuple[str, object]] = []

    async def record(event_type: str, data: object) -> None:
        events.append((event_type, data))

    monkeypatch.setattr(realtime, "broadcast", record)
    return events


@pytest.fixture
async def db(migrated):
    """A pool on the test database, freshly reset to the seed state."""
    await pool.init_pool(TEST_DATABASE_URL)
    await reset_demo()
    yield
    await timers.cancel_all()  # Backend 1's timers must not outlive this test's event loop
    await pool.close_pool()


@pytest.fixture
async def client(db, broadcasts):
    """HTTP client for the app. The pool comes from `db` (ASGITransport skips lifespan)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
