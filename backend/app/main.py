import logging
from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import config, demo, units
from app.db import pool
from app.settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")


async def _warn_if_not_seeded() -> None:
    # Never auto-reset here: that would wipe a running demo on every reload.
    try:
        seeded = await pool.get_pool().fetchval("select exists (select 1 from units)")
    except asyncpg.UndefinedTableError:
        logger.warning("Database has no tables. Run: python -m app.db.migrate")
        return
    if not seeded:
        logger.warning("Database has no seed data. Call POST /api/demo/reset.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await pool.init_pool(settings.database_url)
    await _warn_if_not_seeded()
    # Backend 1: start/restore timers here if needed (e.g. from list_active_incidents()).
    try:
        yield
    finally:
        await pool.close_pool()


def create_app() -> FastAPI:
    app = FastAPI(title="TemanMu API", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Backend 2 routers, all under /api. Still to come: incidents, notifications,
    # community, companion.
    for router in (config.router, units.router, demo.router):
        app.include_router(router, prefix="/api")

    # ------------------------------------------------------------------
    # Backend 1: add here
    #   - POST /api/readings router
    #   - acknowledge/close routes (in app/api/incidents.py)
    #   - @app.websocket("/ws")
    # ------------------------------------------------------------------

    return app


app = create_app()
