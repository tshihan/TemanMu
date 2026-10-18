# Implementation Plan: Same-Hour Neighbours (Jiran Sewaktu)

You are implementing a new companion feature in the TemanMu repo. This document is meant to be self-contained: read it fully before touching code. Where it says "match the existing pattern", open the referenced file and copy its style (naming, comments, error handling).

---

## 1. Background you need

**TemanMu** ("your friend" in Malay) is a hackathon prototype (Sime Darby Property *Township of Tomorrow 2026*). It is a privacy-first safety net for elderly people living alone. It watches only three household signals: **water, electricity, front door**. The elderly resident has **no app and no device**. Family caregivers use a mobile PWA. Township guards use a dashboard.

Design rules every feature must respect:
- **No surveillance:** no cameras, microphones, location tracking or wearables.
- **Zero tech burden on the elderly:** the resident never uses an app or device.
- **Calm by default.**
- **A human always responds:** TemanMu gets a person involved. It does not replace one.
- **Built for a township:** works across many homes.

Read [temanmu-system-intro.md](temanmu-system-intro.md) for a one-page overview. [temanmu-prd.md](temanmu-prd.md) is the full PRD. The API contract (PRD §8) is mirrored by a frontend mock layer, so any API you add must be implemented in **both** the backend and the mock.

### Repo layout (relevant parts)

```
shared/seed.json                     demo data, read by BOTH backend and frontend mock
backend/app/
  main.py                            FastAPI app; routers included here
  settings.py                        pydantic-settings (.env)
  models.py                          Pydantic API models (contract types)
  seed.py                            strict seed.json model (extra="forbid") + validation
  api/companion.py                   existing companion endpoints (buddy, messages)
  services/companion.py              pure matching functions + async operations
  db/companion.py                    plain SQL via asyncpg (no ORM)
  db/migrations/001_init.sql         schema; migrations run in filename order
  services/reset.py                  POST /api/demo/reset: wipes runtime tables, reloads seed
  services/notifications.py          create_notification() = insert + WebSocket broadcast
backend/tests/                       pytest; test_buddy_matching.py is the model to copy
frontend/src/
  api/types.ts                       TS contract types + the Api interface
  api/live.ts                        real HTTP client
  mocks/api.ts                       in-browser mock backend (DEFAULT mode, VITE_USE_MOCK != 'false')
  mocks/shared-client.ts             proxies Api methods to the mock SharedWorker
  caregiver/TogetherTab.tsx          the tab this feature lives in
  caregiver/useCompanion.ts          state hook for the Together tab
  caregiver/copy.ts                  notification titles/bodies and which tab they open
```

Conventions already in the codebase (follow them):
- Python 3.11+, FastAPI, Pydantic v2, asyncpg, **plain SQL**, queries live in `app/db/`.
- Pure logic (no I/O) lives as plain functions in `app/services/*.py` and is unit-tested without a DB (see `match_buddy`, `pick_next_activity`).
- Timestamps are `TIMESTAMPTZ`, serialised as UTC ISO-8601 with `Z` (use the `UtcDatetime` type in `models.py`).
- Never hard-code tunable durations or thresholds in Python: they come from `.env` (via `settings.py`) or `seed.json`.
- Demo time zone is `settings.demo_timezone` (`Asia/Kuala_Lumpur`).
- The frontend uses `R` (e.g. "Mum") from `ctx` for the resident in copy.
- Errors: services raise subclasses of `CompanionError`; the API layer maps them to 404/409 (see `_http_error` in `api/companion.py`).

---

## 2. The feature

**One line:** TemanMu already knows roughly *when* each resident wakes and goes out. It finds another resident in the block who keeps the same hours, and shows the caregiver a suggestion in the **Together tab**. The caregiver can ask the community coordinator to introduce them in person.

**Why:** friendships form between people whose daily paths cross (Festinger, Schachter & Back's 1950 Westgate housing study), not just people with shared hobbies. The existing **Community Buddy** matches by interest with an outside volunteer. This matches **resident to resident by shared routine timing**.

### Demo story (the outcome you are building toward)

1. Caregiver opens the Together tab. A new card, **"Same-hour neighbours"**, explains: "Some neighbours keep the same hours as Mum. With Mum's OK, we can suggest one." Button: **"Mum's happy to be introduced"**.
2. Caregiver taps it (this records consent on Mum's behalf).
3. Card shows the match: **Madam Wong Siew Lan · Floor 1**, "Both early risers who head out in the mornings", plus "A good first meeting: Morning Tai Chi · daily 7:30 · Central Park", and a chip "Simulated match".
4. Caregiver taps **"Ask the coordinator to introduce them"**. Button becomes "Introduction requested". A caregiver notification appears in Updates: "Introduction requested. The community coordinator will arrange for Mum to meet Madam Wong." (recorded only; nobody is actually contacted).
5. A small "Stop sharing Mum's routine" link withdraws consent and hides the match.
6. **Reset Demo** returns everything to step 1.

### Hard scope rules

- **Caregiver Together tab only.** Do **not** add anything to the township/guard dashboard (`frontend/src/dashboard/*`), and do not create `township` role notifications.
- **Never expose times.** The API returns only coarse labels ("early riser", "morning"). No wake times, outing windows, overlap minutes, or the other resident's `unit_id`. Show the floor, not the unit number. Knowing "she leaves every day at 7" would be useful to a burglar; this is the main privacy risk and the design must make it visible that we avoid it.
- **Mutual consent.** A resident only appears as a match if their consent is recorded. A resident only sees matches after their own consent is recorded.
- **A human makes the introduction.** The app never messages the other family; it records a request for the (simulated) coordinator.
- **Do not touch** the rules engine, timers, statuses, baselines, readings or incidents. Routine rhythm is separate from the safety baseline.

### Where routine data comes from

Demo durations are compressed to seconds, so real readings cannot produce a daily rhythm. Like `baseline` (which is marked `source: "simulated_history"`), each resident gets a **seeded `rhythm`** in `seed.json` representing what four weeks of history would show. Add a code comment noting that in production this would be derived from readings: first water use of the day ≈ wake time; door open→close pairs ≈ outing windows; take the typical (median) values over 4 weeks.

---

## 3. Data changes

### 3.1 `shared/seed.json`

Add two fields to **every** unit (all six on Floor 1). Times are local (`Asia/Kuala_Lumpur`), `HH:MM`:

| unit | resident | `rhythm.wake` | `rhythm.outings` | `open_to_neighbours` | why (test role) |
|---|---|---|---|---|---|
| A-101 | Mr Tan Ah Kow | 07:30 | 09:30–11:00 | true | morning but no overlap with A-105 |
| A-102 | Puan Aminah binti Yusof | 06:30 | 07:30–09:00 | true | second-best match (45 min overlap) |
| A-103 | Mr Rajan Pillai | 06:15 | 07:15–08:30 | **false** | would tie best match, excluded by consent |
| A-104 | Madam Wong Siew Lan | 05:45 | 06:50–08:00 | true | **best match for A-105** (60 min overlap) |
| A-105 | Madam Lee Mei Ling | 06:00 | 07:00–08:15 | **false** | the controllable demo unit; caregiver opts in live |
| A-106 | Encik Ismail bin Hassan | 05:30 | 16:30–18:00 | true | evening walker, no overlap |

JSON shape per unit:

```json
"rhythm": { "wake": "06:00", "outings": [{ "start": "07:00", "end": "08:15" }] },
"open_to_neighbours": false
```

`outings` is a list (most residents have one; allow 0–3). The frontend imports `seed.json` directly with inferred types, so adding fields is safe there.

### 3.2 `backend/app/seed.py`

`SeedUnit` uses `extra="forbid"`, so seed loading **will fail** until you add the fields:
- `SeedOuting(_Strict)`: `start: HHMM`, `end: HHMM`, validator `start < end` (no overnight windows).
- `SeedRhythm(_Strict)`: `wake: HHMM`, `outings: list[SeedOuting] = Field(max_length=3)`.
- `SeedUnit`: add `rhythm: SeedRhythm` and `open_to_neighbours: bool`.
Update `backend/tests/test_seed.py` if it builds units by hand.

### 3.3 Migration `backend/app/db/migrations/004_neighbours.sql`

Idempotent, like `001_init.sql`:

```sql
create table if not exists resident_rhythms (
  unit_id    text primary key references units(unit_id) on delete cascade,
  wake_local time not null,
  outings    jsonb not null default '[]'   -- [{"start":"07:00","end":"08:15"}], local times
);

create table if not exists neighbour_consents (
  unit_id      text primary key references units(unit_id) on delete cascade,
  consented_at timestamptz not null
);

create table if not exists neighbour_introductions (
  unit_id           text primary key references units(unit_id) on delete cascade,
  neighbour_unit_id text not null references units(unit_id) on delete cascade,
  requested_at      timestamptz not null
);

-- New caregiver notification kind.
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'morning_reassurance','alert','reminder','acknowledged','closed','auto_resolved',
  'message_delivered','buddy_matched','neighbour_introduced'));

alter table resident_rhythms        enable row level security;
alter table neighbour_consents      enable row level security;
alter table neighbour_introductions enable row level security;
```

Verify the existing constraint name is really `notifications_kind_check` (Postgres's default for the inline check in 001) with `\d notifications` before relying on it.

### 3.4 `backend/app/services/reset.py`

- Add `neighbour_introductions` and `neighbour_consents` to the **runtime** truncate (step 3).
- Add `resident_rhythms` to the **seed** truncate (step 4).
- Insert `resident_rhythms` rows from `u.rhythm` (store outings as JSON; asyncpg needs `json.dumps(...)` for a `jsonb` param unless a codec is set, so check `db/pool.py`).
- Insert `neighbour_consents` rows for every unit with `open_to_neighbours: true`, `consented_at = now`.

---

## 4. Backend

### 4.1 Settings (`settings.py` + `.env.example`)

```
NEIGHBOUR_MIN_OVERLAP_MINUTES=30     # outing windows must overlap at least this much to match
NEIGHBOUR_EARLY_RISER_BEFORE=06:30   # wake strictly before this = "early riser"
```

### 4.2 Pure functions (new file `backend/app/services/neighbours.py`)

Keep these I/O-free so they are unit-testable, like `match_buddy`.

```python
@dataclass(frozen=True)
class Rhythm:
    unit_id: str
    wake: time
    outings: list[tuple[time, time]]

def overlap_minutes(a: Rhythm, b: Rhythm) -> tuple[int, tuple[time, time] | None]:
    """Total minutes the two residents' outing windows overlap, and the longest single
    overlapping window (used for the label and the meeting suggestion)."""

def best_neighbour(me: Rhythm, candidates: list[Rhythm], min_overlap: int) -> Rhythm | None:
    """Highest overlap >= min_overlap. Ties: smallest wake-time difference, then unit_id.
    `candidates` must already exclude `me` and anyone without consent."""

def part_of_day(t: time) -> str:      # "morning" < 12:00 <= "afternoon" < 17:00 <= "evening"

def shared_labels(me: Rhythm, them: Rhythm, window: tuple[time, time], early_before: time) -> list[str]:
    """E.g. ["early risers", "morning outings"]. "early risers" only if BOTH wake before
    early_before. The outing label comes from part_of_day(window start)."""

def pick_meeting_activity(window: tuple[time, time], activities: list[CommunityActivity], tz) -> CommunityActivity | None:
    """Earliest upcoming activity whose LOCAL start time-of-day falls inside the shared window.
    Ignore near_unit_id here: any township activity both can reach is fine."""
```

Expected results with the seed above (put these in tests):
- A-105 best match = **A-104** (60 min). A-103 also overlaps 60 but has no consent.
- If A-104 withdraws, A-105's best match = A-102 (45 min).
- Labels for A-105 + A-104 = `["early risers", "morning outings"]`. Shared window 07:00–08:00.
- Meeting activity = `c2` **Morning Tai Chi** (daily 07:30). Gardening (Sat 09:00) and Cooking (Wed 15:00) fall outside the window.
- A-106 has no match (min overlap 30).

### 4.3 Models (`models.py`)

Add `"neighbour_introduced"` to `NotificationKind`. Then:

```python
class NeighbourMatch(ContractModel):
    name: str                      # resident_name of the neighbour
    floor: int                     # derived from unit_id: "A-104" -> 1 (digits minus last two)
    labels: list[str]              # e.g. ["early risers", "morning outings"]
    meeting_activity: CommunityActivity | None
    simulated: Literal[True] = True

class NeighbourState(ContractModel):
    unit_id: UnitId
    opted_in: bool
    match: NeighbourMatch | None          # always None when opted_in is False
    introduction_requested_at: UtcDatetime | None

class NeighbourConsentRequest(ContractModel):
    unit_id: UnitId
    open: bool                             # true = opt in, false = withdraw

class NeighbourIntroduceRequest(ContractModel):
    unit_id: UnitId
```

Deliberately **no** times, overlap minutes, or neighbour `unit_id` in any response.

### 4.4 DB functions (`backend/app/db/neighbours.py`)

`list_rhythms()`, `get_consented_unit_ids()`, `set_consent(unit_id, at)`, `delete_consent(unit_id)`, `get_introduction(unit_id)`, `insert_introduction(unit_id, neighbour_unit_id, at)`, `delete_introductions_involving(unit_id)`. Match the style of `db/companion.py` (optional `conn` parameter, `connection(conn)` context manager).

### 4.5 Operations (in `services/neighbours.py`)

- `get_state(unit_id) -> NeighbourState`: 404 if unit missing. If not opted in → `match=None`. Otherwise compute the match **live** (not stored) from consented rhythms excluding self.
- `set_consent(unit_id, open)`:
  - `open=True`: upsert consent. Idempotent (no 409).
  - `open=False`: delete consent **and** delete any introduction where this unit is either side. Withdrawing must fully remove them from others' suggestions.
  - Returns the new state. No notification.
- `request_introduction(unit_id)`:
  - 409 `NotOptedIn` if no consent, 404 `NoNeighbourMatch` if no match, 409 `AlreadyRequested` if one exists (catch `asyncpg.UniqueViolationError` for double clicks, like `request_buddy`).
  - Insert the introduction, then `create_notification("caregiver", unit_id, "neighbour_introduced", f"Introduction requested. The community coordinator will arrange for {unit.caregiver_relationship} to meet {neighbour_name}.")`.
  - **Caregiver role only.** Do not notify the township role and do not notify the neighbour's family (the coordinator does that in person; out of scope).

### 4.6 Routes (add to `backend/app/api/companion.py`)

| Method | Path | Body / query | Returns | Errors |
|---|---|---|---|---|
| GET | `/api/companion/neighbours` | `?unit_id=` | `NeighbourState` | 404 unit |
| POST | `/api/companion/neighbours/consent` | `NeighbourConsentRequest` | `NeighbourState` (200) | 404 unit |
| POST | `/api/companion/neighbours/introduce` | `NeighbourIntroduceRequest` | `NeighbourState` (201) | 404 unit/no match, 409 not opted in/already requested |

Write docstrings like the existing routes. Extend `_http_error` or add a sibling for the new error classes (both 409 cases → 409).

### 4.7 Backend tests

- `backend/tests/test_neighbour_matching.py` (pure, no DB): every expected result in §4.2, plus overlap edge cases (touching windows = 0, multiple outings summed), tie-break order, label rules, and a check that the 07:30 tai chi is picked while 09:00 is not.
- Add to `backend/tests/test_api.py` (DB-backed, uses the `client` fixture): full flow for A-105 (state → consent → state shows A-104 → introduce → 201 + one caregiver `neighbour_introduced` notification → introduce again 409 → withdraw → match gone, introduction gone) and that **no response body contains** `"05:45"`, `"07:00"` or `"A-104"`.
- Reset test: after reset, A-105 is opted out and there are no introductions.

Run with `cd backend && TEST_DATABASE_URL=... pytest` (tests refuse to run against the demo DB; see `tests/conftest.py`). Run `python -m app.db.migrate` against the demo DB too.

---

## 5. Frontend

### 5.1 Contract (`frontend/src/api/types.ts`)

- Add `'neighbour_introduced'` to the notification kind union.
- Add `NeighbourMatch` and `NeighbourState` interfaces mirroring §4.3.
- Add to `Api`:
  ```ts
  getNeighbours(unitId: UnitId): Promise<NeighbourState>
  setNeighbourConsent(unitId: UnitId, open: boolean): Promise<NeighbourState>
  requestNeighbourIntroduction(unitId: UnitId): Promise<NeighbourState>
  ```

### 5.2 Clients

- `api/live.ts`: three calls matching §4.6.
- `mocks/shared-client.ts`: add the three methods via `call(...)`, like `getBuddy` / `requestBuddy`. Check `mocks/shared-worker.ts` dispatches by method name; add them there if it uses an explicit list.
- `mocks/api.ts` (**this is what runs by default, so the demo depends on it**): implement the same logic and errors.
  - State: `let neighbourConsents = new Set<string>()` (initialised from `seed.units` where `open_to_neighbours`), `let introductions: { unit_id: string; neighbour_unit_id: string; requested_at: string }[] = []`. Reset both in `resetDemo()`.
  - Port the matching functions (small; keep them in one helper block with a comment "mirrors backend app/services/neighbours.py"). Read thresholds as constants `30` and `'06:30'` with that same comment.
  - `requestNeighbourIntroduction` calls the existing `notify({ role: 'caregiver', kind: 'neighbour_introduced', ... })` with the same message text as the backend.
  - For the meeting activity, reuse `activities()` and compare the local `HH:MM` of `starts_at` in `Asia/Kuala_Lumpur` (see how `initialSnapshot` formats times).

### 5.3 Hook (`caregiver/useCompanion.ts`)

Add `neighbours` state: `{ kind: 'loading' } | { kind: 'ready'; state: NeighbourState } | { kind: 'saving'; state: NeighbourState } | { kind: 'error' }`. Load it in the existing `Promise.allSettled` alongside buddy and activities (so it reloads on `revision` after a demo reset). Add `setNeighbourConsent(open)` and `requestIntroduction()`. On a 409 from introduce, re-fetch state (same pattern as the buddy 409 branch).

### 5.4 UI (`caregiver/TogetherTab.tsx`)

Add a new `<section className="cg-card">` **between** the Community Buddy card and "Happening near {R}". Reuse existing classes (`cg-card-head`, `cg-card-title`, `cg-card-lead`, `cg-chip`, `cg-buddy`, `cg-avatar`, `cg-next`, `cg-btn cg-btn-accent`, `cg-btn cg-btn-outline`, `cg-fineprint`, `cg-warning`, `cg-pending`). Avoid new CSS unless needed; if needed, add it to `caregiver/caregiver.css`.

States:

| State | Content |
|---|---|
| loading | nothing, or the same pending row the buddy card uses |
| not opted in | Title "Same-hour neighbours". Lead: "Some neighbours keep the same hours as {R}. With {R}'s OK, we can suggest one to meet." Fine print: "We only share a rough pattern like 'early riser', never times, and never {R}'s unit number." Button (accent): "{R}'s happy to be introduced". |
| opted in, no match | "No neighbour keeps {R}'s hours yet. We'll keep looking." + withdraw link |
| opted in, match | Chip "Simulated match". Avatar with `initials(match.name)`, **name**, "Floor {floor}". Line: labels joined into a sentence, e.g. "Both early risers who head out in the mornings". If `meeting_activity`: a `cg-next` block "A good first meeting" + title + `weekdayTime(starts_at)` + location. Button (outline): "Ask the coordinator to introduce them" → after success "Introduction requested" (disabled, check icon), fine print "Recorded only; nobody is contacted." |
| any opted-in state | Small text button at the bottom: "Stop sharing {R}'s routine" → `setNeighbourConsent(false)`; toast "{R}'s routine is no longer shared". |
| error | `cg-warning`: "We couldn't load neighbours just now." + "Try again". |

Write a small helper to turn `labels` into a sentence (`["early risers", "morning outings"]` → "Both early risers who head out in the mornings"; single label → "Both {label}"). Keep it next to the component or in `format.ts`.

Toasts via the existing `onToast` prop.

### 5.5 Notification copy (`caregiver/copy.ts`)

- In `notificationCopy`, add `case 'neighbour_introduced'`: title "Introduction requested", body = `n.message`, Icon `Users` (or `HandHeart` from lucide-react if available), tone `'warm'`.
- In the kind→tab map (line ~96), map `neighbour_introduced: 'together'`.
- Check `tsc` for any other exhaustive `switch`/`Record<NotificationKind, …>` that now errors, and handle it. The township dashboard should never receive this kind (caregiver role only), but if a `Record` there requires the key, add a harmless entry. **Do not add UI to the dashboard.**

---

## 6. Verification checklist

1. `cd backend && python -m app.db.migrate` applies `004_neighbours.sql`; running it again is a no-op.
2. Backend tests pass (pure + API).
3. `cd frontend && npx tsc -b` (or the project's `npm run build`) has no type errors; `npm run lint` clean.
4. **Mock mode** (default): `npm run dev`, open the caregiver PWA, Together tab: walk through the demo story in §2 steps 1–6, including Reset Demo.
5. **Live mode**: `VITE_USE_MOCK=false` with the backend running: same walk-through, and the Updates tab shows the notification via WebSocket.
6. Township dashboard shows nothing new.
7. Network tab: no response contains wake/outing times or the neighbour's `unit_id`.

## 7. Out of scope (do not build)

- A "nudge" when a matched neighbour hasn't gone out for days (future idea).
- Notifying the other family, a coordinator role/screen, or anything on the guard dashboard.
- Deriving rhythms from live readings.
- Multiple suggestions or a browsing list (exactly one best match).
- Updating PRD documents. Mention in your final summary that `temanmu-prd.md` §8 should gain the three endpoints, and let the user decide.

## 8. Suggested commit order

1. Seed + seed model + migration + reset (backend boots, existing tests pass).
2. Pure matching + tests.
3. DB, service, routes + API tests.
4. Frontend types, live client, mock.
5. Hook, Together tab card, notification copy.

Do not commit or push unless the user asks.
