from datetime import datetime, time, timedelta, timezone

from app.models import CommunityActivity
from app.seed import load_seed, next_occurrence
from app.services.neighbours import (
    Rhythm,
    best_neighbour,
    floor_of,
    overlap_minutes,
    part_of_day,
    pick_meeting_activity,
    shared_labels,
)
from app.settings import settings

NOW = datetime(2026, 10, 15, 6, 0, tzinfo=timezone.utc)  # 14:00 in Kuala Lumpur
TZ = "Asia/Kuala_Lumpur"
EARLY = time(6, 30)

SEED = load_seed(settings.seed_file)
RHYTHMS = {
    u.unit_id: Rhythm(
        u.unit_id,
        time.fromisoformat(u.rhythm.wake),
        [(time.fromisoformat(o.start), time.fromisoformat(o.end)) for o in u.rhythm.outings],
    )
    for u in SEED.units
}
CONSENTED = {u.unit_id for u in SEED.units if u.open_to_neighbours}


def rhythm(unit_id: str, wake: str, *outings: tuple[str, str]) -> Rhythm:
    return Rhythm(unit_id, time.fromisoformat(wake), [(time.fromisoformat(s), time.fromisoformat(e)) for s, e in outings])


def candidates(me: str, consented: set[str] = CONSENTED) -> list[Rhythm]:
    return [r for u, r in RHYTHMS.items() if u != me and u in consented]


# --- matching with the seed ------------------------------------------------------------------


def test_a105_matches_madam_wong():
    other, window = best_neighbour(RHYTHMS["A-105"], candidates("A-105"), 30)
    assert other.unit_id == "A-104"
    assert window == (time(7, 0), time(8, 0))


def test_rajan_overlaps_as_much_but_has_not_consented():
    assert overlap_minutes(RHYTHMS["A-105"], RHYTHMS["A-103"])[0] == 60
    assert "A-103" not in CONSENTED


def test_without_wong_the_next_best_is_aminah():
    other, _ = best_neighbour(RHYTHMS["A-105"], candidates("A-105", CONSENTED - {"A-104"}), 30)
    assert other.unit_id == "A-102"


def test_evening_walker_has_no_match():
    assert best_neighbour(RHYTHMS["A-106"], candidates("A-106"), 30) is None


def test_seed_labels_for_a105_and_a104():
    _, window = best_neighbour(RHYTHMS["A-105"], candidates("A-105"), 30)
    assert shared_labels(RHYTHMS["A-105"], RHYTHMS["A-104"], window, EARLY) == ["early risers", "morning outings"]


# --- overlap and tie-breaks -----------------------------------------------------------------


def test_touching_windows_do_not_overlap():
    a = rhythm("X", "06:00", ("07:00", "08:00"))
    b = rhythm("Y", "06:00", ("08:00", "09:00"))
    assert overlap_minutes(a, b) == (0, None)


def test_multiple_outings_are_summed_and_longest_window_returned():
    a = rhythm("X", "06:00", ("07:00", "08:00"), ("16:00", "17:00"))
    b = rhythm("Y", "06:00", ("07:30", "08:00"), ("16:00", "16:50"))
    assert overlap_minutes(a, b) == (80, (time(16, 0), time(16, 50)))


def test_below_minimum_overlap_is_no_match():
    me = rhythm("X", "06:00", ("07:00", "08:00"))
    assert best_neighbour(me, [rhythm("Y", "06:00", ("07:40", "09:00"))], 30) is None


def test_tie_breaks_on_closest_wake_then_unit_id():
    me = rhythm("X", "06:00", ("07:00", "08:00"))
    far = rhythm("A", "05:00", ("07:00", "08:00"))
    near = rhythm("B", "06:10", ("07:00", "08:00"))
    twin = rhythm("C", "06:10", ("07:00", "08:00"))
    assert best_neighbour(me, [far, twin, near], 30)[0].unit_id == "B"


# --- labels ------------------------------------------------------------------------------------


def test_early_risers_only_when_both_wake_early():
    me = rhythm("X", "06:00", ("07:00", "08:00"))
    late = rhythm("Y", "06:30", ("07:00", "08:00"))  # 06:30 is not strictly before 06:30
    assert shared_labels(me, late, (time(7, 0), time(8, 0)), EARLY) == ["morning outings"]


def test_part_of_day():
    assert [part_of_day(time(h, 0)) for h in (7, 11, 12, 16, 17, 20)] == [
        "morning", "morning", "afternoon", "afternoon", "evening", "evening",
    ]  # fmt: skip


def test_floor_of():
    assert [floor_of(u) for u in ("A-104", "A-1203", "A-2401")] == [1, 12, 24]


# --- meeting activity --------------------------------------------------------------------------


def seed_activities() -> list[CommunityActivity]:
    return [
        CommunityActivity(
            activity_id=a.activity_id,
            title=a.title,
            starts_at=next_occurrence(a.schedule, NOW, TZ),
            location=a.location,
            near_unit_id=a.near_unit_id,
        )
        for a in SEED.community_activities
    ]


def test_morning_tai_chi_fits_the_shared_window():
    picked = pick_meeting_activity((time(7, 0), time(8, 0)), seed_activities(), NOW, TZ)
    assert picked.activity_id == "c2"


def test_no_activity_inside_window():
    assert pick_meeting_activity((time(10, 0), time(11, 0)), seed_activities(), NOW, TZ) is None


def test_upcoming_activity_beats_one_that_already_started():
    def at(activity_id: str, hours: float) -> CommunityActivity:
        # 23:30 UTC = 07:30 in Kuala Lumpur
        starts = datetime(2026, 10, 14, 23, 30, tzinfo=timezone.utc) + timedelta(hours=hours)
        return CommunityActivity(activity_id=activity_id, title=activity_id, starts_at=starts, location="x", near_unit_id="A-105")

    past, upcoming = at("past", 0), at("upcoming", 24)
    picked = pick_meeting_activity((time(7, 0), time(8, 0)), [past, upcoming], NOW, TZ)
    assert picked.activity_id == "upcoming"
