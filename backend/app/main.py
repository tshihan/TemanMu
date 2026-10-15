import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import pool
from app.settings import settings

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await pool.init_pool(settings.database_url)
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

    # Backend 2 routers, all under /api. Added phase by phase:
    # config, units, incidents, notifications, community, companion, demo.

    # ------------------------------------------------------------------
    # Backend 1: add here
    #   - POST /api/readings router
    #   - acknowledge/close routes (in app/api/incidents.py)
    #   - @app.websocket("/ws")
    # ------------------------------------------------------------------

    return app


app = create_app()
