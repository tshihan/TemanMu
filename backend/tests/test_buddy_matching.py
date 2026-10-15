from datetime import datetime, timedelta, timezone

from app.models import Buddy, CommunityActivity
from app.seed import load_seed
from app.services.companion import match_buddy, pick_next_activity
from app.settings import settings

NOW = datetime(2026, 10, 15, 6, 0, tzinfo=timezone.utc)

SEED = load_seed(settings.seed_file)
BUDDIES = [Buddy(**b.model_dump()) for b in sorted(SEED.buddies, key=lambda b: b.buddy_id)]
INTERESTS = {u.unit_id: list(u.interests) for u in SEED.units}


# --- match_buddy (PRD §9.6) ----------------------------------------------------------------


def test_a105_matches_auntie_mei_on_gardening():
    buddy, interest = match_buddy(INTERESTS["A-105"], BUDDIES)
    assert (buddy.buddy_id, buddy.name, interest) == ("b1", "Auntie Mei", "gardening")


def test_a101_chess_matches_encik_rahman():
    buddy, interest = match_buddy(INTERESTS["A-101"], BUDDIES)
    assert (buddy.name, interest) == ("Encik Rahman", "chess")


def test_a104_karaoke_matches_kak_ros():
    buddy, interest = match_buddy(INTERESTS["A-104"], BUDDIES)
    assert (buddy.name, interest) == ("Kak Ros", "karaoke")


def test_buddy_order_beats_interest_order():
    # A-102 likes cooking: b2 (Encik Rahman) comes before b3 (Kak Ros), both cook.
    buddy, _ = match_buddy(INTERESTS["A-102"], BUDDIES)
    assert buddy.buddy_id == "b2"


def test_no_shared_interest_returns_none():
    assert match_buddy(["origami"], BUDDIES) is None
    assert match_buddy([], BUDDIES) is None


def test_match_is_case_insensitive_and_returns_resident_wording():
    buddies = [Buddy(buddy_id="b9", name="X", interests=["Tai Chi"])]
    assert match_buddy(["TAI CHI"], buddies)[1] == "TAI CHI"


def activity(activity_id: str, title: str, days: float, near: str = "A-105") -> CommunityActivity:
    return CommunityActivity(
        activity_id=activity_id,
        title=title,
        starts_at=NOW + timedelta(days=days),
        location="Somewhere",
        near_unit_id=near,
    )


# --- next_activity rule (plan §10.4) -----------------------------------------------------


def test_next_activity_prefers_title_matching_interest():
    acts = [activity("x1", "Bingo Night", 1), activity("c1", "Community Gardening Session", 2)]
    assert pick_next_activity("A-105", "gardening", acts, NOW).activity_id == "c1"


def test_next_activity_match_is_case_insensitive():
    acts = [activity("c2", "Morning TAI CHI", 1)]
    assert pick_next_activity("A-105", "tai chi", acts, NOW).activity_id == "c2"


def test_next_activity_earliest_matching_wins():
    acts = [activity("late", "Gardening Club", 5), activity("early", "Gardening Session", 2)]
    assert pick_next_activity("A-105", "gardening", acts, NOW).activity_id == "early"


def test_next_activity_falls_back_to_earliest_near_unit():
    acts = [activity("b", "Bingo Night", 3), activity("a", "Book Club", 1)]
    assert pick_next_activity("A-105", "gardening", acts, NOW).activity_id == "a"


def test_next_activity_ignores_other_units_and_past_activities():
    acts = [
        activity("other", "Gardening Session", 1, near="A-106"),
        activity("past", "Gardening Session", -1),
    ]
    assert pick_next_activity("A-105", "gardening", acts, NOW) is None


def test_next_activity_starting_now_counts():
    acts = [activity("now", "Gardening Session", 0)]
    assert pick_next_activity("A-105", "gardening", acts, NOW).activity_id == "now"
