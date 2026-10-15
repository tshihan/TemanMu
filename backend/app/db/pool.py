from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

_pool: asyncpg.Pool | None = None


async def _init_connection(conn: asyncpg.Connection) -> None:
    await conn.execute("set timezone = 'UTC'")


async def init_pool(dsn: str) -> None:
    global _pool
    # statement_cache_size=0 keeps this working on Supabase's transaction pooler (port 6543).
    # The session pooler (port 5432) is preferred.
    _pool = await asyncpg.create_pool(
        dsn, min_size=1, max_size=5, statement_cache_size=0, init=_init_connection
    )


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialised")
    return _pool


@asynccontextmanager
async def connection(conn: asyncpg.Connection | None = None) -> AsyncIterator[asyncpg.Connection]:
    """Use the caller's connection (so it can group calls in one transaction), or borrow one."""
    if conn is not None:
        yield conn
    else:
        async with get_pool().acquire() as acquired:
            yield acquired
