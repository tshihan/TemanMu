import logging
from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import timers
from app.api import community, companion, config, demo, incidents, notifications, readings, units
from app.db import pool
from app.realtime import ws
from app.services import monitoring
from app.settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")


async def _warn_if_not_seeded() -> bool:
    """True when the database has tables and seed data."""
    # Never auto-reset here: that would wipe a running demo on every reload.
    try:
        seeded = await pool.get_pool().fetchval("select exists (select 1 from units)")
    except asyncpg.UndefinedTableError:
        logger.warning("Database has no tables. Run: python -m app.db.migrate")
        return False
    if not seeded:
        logger.warning("Database has no seed data. Call POST /api/demo/reset.")
    return bool(seeded)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await pool.init_pool(settings.database_url)
    if await _warn_if_not_seeded():
        # Backend 1: resume grace/reminder timers of active incidents and the quiet-gap watch.
        await monitoring.restore()
    try:
        yield
    finally:
        await timers.cancel_all()
        await pool.close_pool()


def create_app() -> FastAPI:
    app = FastAPI(title="TemanMu API", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Backend 2 routers, all under /api.
    for router in (
        config.router,
        units.router,
        incidents.router,
        notifications.router,
        community.router,
        companion.router,
        demo.router,
    ):
        app.include_router(router, prefix="/api")

    # Backend 1: POST /api/readings, and the WebSocket at /ws (no /api prefix).
    # Acknowledge and close live in app/api/incidents.py.
    app.include_router(readings.router, prefix="/api")
    app.include_router(ws.router)

    return app


app = create_app()
