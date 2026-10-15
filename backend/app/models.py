"""Pydantic models for every PRD §8.1 type. Shared by Backend 1 and Backend 2.

Phase 1 only defines the base model and timestamp type; the contract models are added in Phase 4.
"""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, PlainSerializer

from app.timeutil import iso

Status = Literal["routine", "possible_away", "unusual_inactivity", "unresolved_concern"]

# Use for every timestamp field so it serialises as "...Z" with millisecond precision.
UtcDatetime = Annotated[datetime, PlainSerializer(iso, return_type=str | None)]


class ContractModel(BaseModel):
    """Base for all API models."""
