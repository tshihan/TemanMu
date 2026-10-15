from fastapi import APIRouter

from app.models import Config
from app.services.snapshot import current_config

router = APIRouter(tags=["config"])


@router.get("/config", response_model=Config)
async def get_config() -> Config:
    """Global timings from .env. No database access."""
    return current_config()
