from datetime import time
from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# backend/ directory: .env and relative paths resolve from here, not from the CWD,
# so uvicorn, the migrate script and pytest all behave the same.
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    database_url: str
    grace_period_seconds: int = 15
    reminder_interval_seconds: int = 15
    # How long the simulated voice call rings before "no answer" (within the grace period).
    voice_call_ring_seconds: float = 2
    # Demo durations for a sustained household load. These are concern triggers,
    # not evidence of a fall or of which appliance is running.
    continuous_water_seconds: int = 45
    high_power_seconds: int = 45
    high_power_above_standby_kw: float = 1.0
    controllable_unit_id: str = "A-105"
    seed_file: Path = Path("../shared/seed.json")
    # NoDecode stops pydantic-settings from JSON-decoding the env value, so the
    # validator below can accept "http://a,http://b".
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]
    demo_timezone: str = "Asia/Kuala_Lumpur"
    # Same-hour neighbours: outing windows must overlap at least this long to match, and a
    # resident who wakes strictly before the given local time counts as an early riser.
    neighbour_min_overlap_minutes: int = 30
    neighbour_early_riser_before: time = time(6, 30)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("seed_file", mode="after")
    @classmethod
    def resolve_seed_file(cls, v: Path) -> Path:
        return v if v.is_absolute() else (BACKEND_DIR / v).resolve()


settings = Settings()
