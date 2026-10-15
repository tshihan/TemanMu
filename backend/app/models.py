"""Pydantic models for every PRD §8.1 type. Shared by Backend 1 and Backend 2.

Phase 1 only defines the base model and timestamp type; the contract models are added in Phase 4.
"""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, PlainSerializer

from app.timeutil import iso

# Use for every timestamp field so it serialises as "...Z" with millisecond precision.
UtcDatetime = Annotated[datetime, PlainSerializer(iso, return_type=str | None)]


class ContractModel(BaseModel):
    """Base for all API models."""
