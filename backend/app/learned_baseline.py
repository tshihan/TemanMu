"""Baselines that come from the trained models (backend/ml) instead of typed-in numbers.

- Quiet Gap Model (shared/ml/A-105_quiet_gap.json): how long she normally goes without water.
- Outing Model (shared/ml/A-105_outing.json): how long she is normally out after tapping out.

Each model file holds the resident's learned limit for every 15 minutes of the week. The demo
plays one scene at a set time of day, so on reset we read the limit at that time ("story"
minutes, e.g. 120 at 08:00) and shrink it to demo seconds with a fixed speed (e.g. 1 demo
second = 24 story minutes, so 120 min -> 5 s). The rules engine then runs on that number as usual.
"""

import json
from pathlib import Path

from pydantic import ValidationError

from app.models import LearnedLimit
from app.seed import SeedBaseline, SeedError, SeedLearnedLimit

_DAY = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
SCENE_WEEKDAY = 0  # the demo day: a Monday (not a market day)


def _resolve(typed_in: int | None, cfg: SeedLearnedLimit | None, seed_dir: Path) -> tuple[int, LearnedLimit | None]:
    if cfg is None:
        assert typed_in is not None  # SeedBaseline requires one of the two
        return typed_in, None

    path = (seed_dir / cfg.model_file).resolve()
    try:
        model = json.loads(path.read_text(encoding="utf-8"))
        hh, mm = (int(x) for x in cfg.scene_time.split(":"))
        story_minutes = model["limits_minutes"][_DAY[SCENE_WEEKDAY]][(hh * 60 + mm) // model["slot_minutes"]]
        learned = LearnedLimit(
            story_minutes=story_minutes,
            scene_time=cfg.scene_time,
            story_minutes_per_demo_second=cfg.story_minutes_per_demo_second,
            model=model["model"]["name"],
            trained_days=model["trained_on"]["days"],
            source=model["source"],
        )
    except FileNotFoundError:
        raise SeedError(f"learned model file not found: {path} (run the training scripts in backend/ml)") from None
    except (json.JSONDecodeError, KeyError, IndexError, TypeError, ValidationError) as e:
        raise SeedError(f"learned model file is not readable: {path}: {e!r}") from None

    return max(1, round(story_minutes / cfg.story_minutes_per_demo_second)), learned


def resolve_quiet_gap(baseline: SeedBaseline, seed_dir: Path) -> tuple[int, LearnedLimit | None]:
    """(demo quiet gap in seconds, how it was learned). Typed-in seeds give (seconds, None).

    Raises SeedError if the model file is missing or unreadable, so a reset stops before wiping.
    """
    return _resolve(baseline.usual_quiet_gap_seconds, baseline.learned_quiet_gap, seed_dir)


def resolve_outing(baseline: SeedBaseline, seed_dir: Path) -> tuple[int, LearnedLimit | None]:
    """(demo usual outing in seconds, how it was learned), as resolve_quiet_gap."""
    return _resolve(baseline.usual_outing_seconds, baseline.learned_outing, seed_dir)
