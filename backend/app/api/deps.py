from fastapi import HTTPException

from app.db import units as db_units


async def require_unit(unit_id: str) -> None:
    """404 for an unknown unit_id, used by every route that takes one."""
    if not await db_units.unit_exists(unit_id):
        raise HTTPException(status_code=404, detail="Unit not found")
