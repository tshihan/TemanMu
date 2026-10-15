"""Apply SQL migrations in filename order.

Usage (from backend/):  python -m app.db.migrate

Each file runs in its own transaction and is recorded in schema_migrations, so files that
were already applied are skipped. The migrations are also idempotent, so pasting them into
the Supabase SQL editor first and running this afterwards is fine.
"""

import asyncio
import logging
from pathlib import Path

import asyncpg

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"
# Arbitrary constant: serialises concurrent migrate runs (e.g. two teammates at once).
_LOCK_KEY = 7_105_105


async def apply_migrations(dsn: str) -> list[str]:
    """Apply pending migrations and return the filenames that were applied."""
    conn = await asyncpg.connect(dsn, statement_cache_size=0)
    try:
        await conn.execute("set timezone = 'UTC'")
        await conn.execute("select pg_advisory_lock($1)", _LOCK_KEY)
        await conn.execute(
            """create table if not exists schema_migrations (
                 filename   text primary key,
                 applied_at timestamptz not null default now()
               )"""
        )
        await conn.execute("alter table schema_migrations enable row level security")
        done = {r["filename"] for r in await conn.fetch("select filename from schema_migrations")}

        applied = []
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if path.name in done:
                logger.info("skip  %s (already applied)", path.name)
                continue
            async with conn.transaction():
                await conn.execute(path.read_text(encoding="utf-8"))
                await conn.execute("insert into schema_migrations (filename) values ($1)", path.name)
            logger.info("apply %s", path.name)
            applied.append(path.name)
        return applied
    finally:
        await conn.close()


def main() -> None:
    from app.settings import settings

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    applied = asyncio.run(apply_migrations(settings.database_url))
    logger.info("%d migration(s) applied", len(applied))


if __name__ == "__main__":
    main()
