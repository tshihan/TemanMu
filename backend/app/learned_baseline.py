"""Quiet gaps that come from the Quiet Gap Model (backend/ml) instead of a typed-in number.

The model file (e.g. shared/ml/A-105_quiet_gap.json) holds the resident's learned limit for every
15 minutes of the day. The demo plays one scene at a set time of day, so on reset we read the
limit at that time ("story" minutes, e.g. 115 at 08:00) and shrink it to demo seconds with a
fixed speed (e.g. 1 demo second = 24 story minutes, so 115 min -> 5 s). The rules engine then
runs on that number as usual.
"""

import json
from pathlib import Path

from pydantic import ValidationError

from app.models import LearnedQuietGap
from app.seed import SeedBaseline, SeedError

_DAY = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
SCENE_WEEKDAY = 0  # the demo day; her learned 08:00 limit is the same every day of the week


def resolve_quiet_gap(baseline: SeedBaseline, seed_dir: Path) -> tuple[int, LearnedQuietGap | None]:
    """(demo quiet gap in seconds, how it was learned). Typed-in seeds give (seconds, None).

    Raises SeedError if the model file is missing or unreadable, so a reset stops before wiping.
    """
    cfg = baseline.learned_quiet_gap
    if cfg is None:
        return baseline.usual_quiet_gap_seconds, None

    path = (seed_dir / cfg.model_file).resolve()
    try:
        model = json.loads(path.read_text(encoding="utf-8"))
        slot_minutes = model["slot_minutes"]
        hh, mm = (int(x) for x in cfg.scene_time.split(":"))
        story_minutes = model["limits_minutes"][_DAY[SCENE_WEEKDAY]][(hh * 60 + mm) // slot_minutes]
        learned = LearnedQuietGap(
            story_minutes=story_minutes,
            scene_time=cfg.scene_time,
            story_minutes_per_demo_second=cfg.story_minutes_per_demo_second,
            model=model["model"]["name"],
            trained_days=model["trained_on"]["days"],
            source=model["source"],
        )
    except FileNotFoundError:
        raise SeedError(f"learned quiet gap model not found: {path} (run python -m ml.train_quiet_gap)") from None
    except (json.JSONDecodeError, KeyError, IndexError, TypeError, ValidationError) as e:
        raise SeedError(f"learned quiet gap model is not readable: {path}: {e!r}") from None

    seconds = max(1, round(story_minutes / cfg.story_minutes_per_demo_second))
    return seconds, learned
