import copy
import json

import pytest

from app.learned_baseline import resolve_outing, resolve_quiet_gap
from app.seed import SeedError, load_seed
from app.settings import settings


def _a105(seed):
    return next(u for u in seed.units if u.unit_id == "A-105")


def test_a105_quiet_gap_comes_from_the_model():
    seed = load_seed(settings.seed_file)
    model = json.loads((settings.seed_file.parent / "ml" / "A-105_quiet_gap.json").read_text())
    story_minutes = model["limits_minutes"]["mon"][8 * 60 // model["slot_minutes"]]  # 08:00

    seconds, learned = resolve_quiet_gap(_a105(seed).baseline, settings.seed_file.parent)

    assert learned is not None
    assert learned.story_minutes == story_minutes
    assert learned.scene_time == "08:00"
    assert seconds == max(1, round(story_minutes / learned.story_minutes_per_demo_second))
    assert 3 <= seconds <= 8  # the demo wait stays short


def test_a105_outing_comes_from_the_model():
    seed = load_seed(settings.seed_file)
    model = json.loads((settings.seed_file.parent / "ml" / "A-105_outing.json").read_text())
    story_minutes = model["limits_minutes"]["mon"][7 * 60 // model["slot_minutes"]]  # 07:00

    seconds, learned = resolve_outing(_a105(seed).baseline, settings.seed_file.parent)

    assert learned is not None
    assert learned.model == "Outing Model"
    assert learned.story_minutes == story_minutes
    assert learned.scene_time == "07:00"
    assert seconds == max(1, round(story_minutes / learned.story_minutes_per_demo_second))
    assert 3 <= seconds <= 6  # a short demo wait


def test_typed_in_baselines_are_unchanged():
    seed = load_seed(settings.seed_file)
    a101 = next(u for u in seed.units if u.unit_id == "A-101")
    assert resolve_quiet_gap(a101.baseline, settings.seed_file.parent) == (40, None)
    assert resolve_outing(a101.baseline, settings.seed_file.parent) == (60, None)


def test_missing_model_file_is_clear(tmp_path):
    seed = load_seed(settings.seed_file)
    with pytest.raises(SeedError, match="not found"):
        resolve_quiet_gap(_a105(seed).baseline, tmp_path)


@pytest.mark.parametrize("typed_in, learned", [("usual_quiet_gap_seconds", "learned_quiet_gap"),
                                                ("usual_outing_seconds", "learned_outing")])
@pytest.mark.parametrize("change", ["both", "neither"])
def test_baseline_needs_exactly_one_of_each(tmp_path, change, typed_in, learned):
    raw = json.loads(settings.seed_file.read_text())
    baseline = next(u for u in raw["units"] if u["unit_id"] == "A-105")["baseline"]
    if change == "both":
        baseline[typed_in] = 5
    else:
        del baseline[learned]
    path = tmp_path / "seed.json"
    path.write_text(json.dumps(copy.deepcopy(raw)))
    with pytest.raises(SeedError, match="exactly one"):
        load_seed(path)
