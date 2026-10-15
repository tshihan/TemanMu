from datetime import datetime, timedelta, timezone

from app.models import CommunityActivity
from app.services.companion import pick_next_activity

NOW = datetime(2026, 10, 15, 6, 0, tzinfo=timezone.utc)


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
