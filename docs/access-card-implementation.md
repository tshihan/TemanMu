# Access card: implementation handoff

This covers adding township access-card taps to TemanMu. The 3D simulator part is done. The rules, backend, and the caregiver and guard screens are still to do.

## Branch rules (read first)

- Work only on the **`feature/access-card`** branch:
  ```bash
  git fetch origin
  git switch feature/access-card
  ```
- **Merged into `main` on 4 Nov 2026.** New access-card work goes on a fresh branch from `main`.
- Don't rebase or force-push the branch. Other people may have pulled it.

## The idea in short

Many townships already have access cards at the lift lobby or gate. A card tap tells us **who** went out or came in, **which way**, and **where**. A door sensor can't tell us any of this. So:

- **Card homes** use water, electricity and access card, with **no door sensor**.
- **Door homes** (no usable card system, or a system that only records entry) use water, electricity and door sensor, which is how TemanMu works today.
- Each home is one or the other, set at setup. We never use both in the same home.
- Madam Lee (A-105) becomes a **card home** in the demo.

A card tap means "she probably went out" or "she probably came back", not "she is safe". Cards get lent, taps get missed, and someone else may be home.

## Done: 3D simulator

| What | Where |
|---|---|
| Shared corridor outside the flat (floor and low outer wall) | [Architecture.tsx](../frontend/src/home/Architecture.tsx) |
| Lift lobby pillar with a card reader. The light flashes green on a tap and a "Card tapped · Out/In" label shows | `LobbyCardReader` in Architecture.tsx |
| "Lift lobby · Block A" sign, mounted after the home loads | `LobbySign` in Architecture.tsx, rendered in `Scene` in [HomeEnvironment.tsx](../frontend/src/home/HomeEnvironment.tsx) |
| New walking points `corridor`, `readerApproach`, `lobby` and their routes | [navigation.ts](../frontend/src/home/character/navigation.ts) |
| New interaction `cardReader` (she walks over, reaches out and taps) | [registry.ts](../frontend/src/home/interactions/registry.ts) |
| New scenario step `tapCard` (`direction: 'out' \| 'in'`) | [definitions.ts](../frontend/src/home/scenarios/definitions.ts), [ScenarioController.ts](../frontend/src/home/scenarios/ScenarioController.ts) |
| Card beep sound | [soundscape.ts](../frontend/src/home/soundscape.ts) |
| Tests: tap order in scenarios, clear walking routes through the corridor | `definitions.test.mjs`, `navigation.test.mjs` |

**Scenarios**

| Scenario | Status | What happens |
|---|---|---|
| Normal Morning | unchanged | |
| Going Out | updated | Out the door, tap out at the lobby, gone, come back, tap in, walk home |
| **Not Back Yet** | new | Taps out and never comes back |
| **Tapped In, Home Quiet** | new | Taps in, then falls in the corridor before reaching the flat |
| Unusual Inactivity | unchanged | |
| False Alarm Recovery | unchanged | |

**Limits right now**
- Card taps are **visual only**. Nothing reaches the backend, so the caregiver app and guard dashboard don't react to them.
- In Going Out, the door still sends its open/close reading as before.
- The two new scenarios play the story, but no alert fires at the end yet.
- You can't click the reader by hand. It only runs inside scenarios.

## Status (3 Nov 2026)

Sections 1 to 6 below are **done**. Section 1 is Lee Yang's commit; sections 2 to 6 were built on top of it. What changed against the plan:

- **Database:** run `python -m app.db.migrate` to apply `015_card_arrival.sql` (adds `units.awaiting_arrival_since`).
- **Row 7 dropped:** card homes send **no door readings** at all. The 3D door still opens and closes, but only for show. If a door reading does arrive for a card home, it is stored and never changes the status.
- **Tapped-in window:** 20 seconds in the demo (`ARRIVAL_WINDOW_SECONDS` in `rules/engine.py`, mirrored in the mock and the simulator).
- **A-105's usual outing** is now 20 s in `shared/seed.json` (was 45 s), so "Not Back Yet" doesn't keep the audience waiting. Run **Reset demo** to load it.
- **Unit** gains `last_access` (latest tap, read from `access_events`) and `awaiting_arrival_since`. **HistoryDay** gains `card_taps`; card homes leave `door_opened_at` empty.
- **A tap while marked away** sends the caregiver the usual away-activity notice ("Mum tapped in at … while marked away."), so the existing "She's back" answer ends the away period.
- **Going Out** now ends with the kettle, which confirms she's home (otherwise she'd stay "on the way home").
- **Not built (optional):** the "hasn't been out for X days" nudge, "Link access card" in Settings, and clicking the reader by hand.

Rules are described for everyone in [detection-rules.md](detection-rules.md) section 9. Rule tests: `backend/tests/test_card_rules.py`.

## Plan (as handed over)

### 1. Backend: access events

- Add an access event, separate from the sensor readings. Don't reuse the door sensor's open/closed reading:
  `unit_id`, `card_holder` (the resident), `direction` (`out` | `in`), `access_point` (e.g. "Block A lift lobby"), `at`.
- Add an endpoint for it, e.g. `POST /access-events`. Use [api/readings.py](../backend/app/api/readings.py) as the pattern, and add storage under `backend/app/db/` plus a migration.
- Broadcast it over the WebSocket like readings ([realtime/](../backend/app/realtime/)).
- Add an outing-signal setting to each unit (`card` | `door`). Seed A-105 as `card`.

### 2. Backend: rules ([rules/engine.py](../backend/app/rules/engine.py))

For **card homes** only. Door homes keep today's logic unchanged.

| What happens | Result |
|---|---|
| Taps **out** and the home is quiet (no water, power at standby) | `possible_away`. Reason: "Tapped out at Block A lift lobby, 10:12" |
| Taps out, but water or power is still in use | Stays `routine`. Note: "Card tapped out, but there's activity at home" |
| Out longer than her usual outing | Incident **"Not back yet"** (replaces "outing too long" for card homes) |
| Taps **in**, then no water or power use within N minutes (pick a demo-friendly value) | New incident **"Tapped in, no activity at home"** |
| Taps in, then water or power use | Back home, return to `routine` |
| No tap, and the home goes quiet | Normal quiet-gap inactivity (T1). The safe default is to assume she's home |
| Door opens (card home) | Counts as activity at home only. It never decides whether she's out |
| No tap out for several days | **Not an alert.** A gentle nudge for the caregiver (see 5). Optional for this round |

- Missing or ambiguous taps must never count as proof she went out.
- Keep the current door rules for door homes.
- **Mirror the same rules in the mock API** ([mocks/api.ts](../frontend/src/mocks/api.ts)), which the demo uses when there's no backend.
- Add backend tests in [tests/test_rules.py](../backend/tests/test_rules.py) for each row above.

### 3. Simulator wiring

- In `interactWith` in [HomeEnvironment.tsx](../frontend/src/home/HomeEnvironment.tsx), the `cardReader` branch has the comment *"Visual only for now"*. Send the access event there. `cardDirection.current` already holds `'out'` or `'in'`.
- Add the call to the API client ([api/](../frontend/src/api/)) and the types.
- For card homes, decide whether the door click should still send a door reading. If it does, the backend must treat it as activity only.
- Optional: let the presenter click the reader by hand. Watch out: she'd need to walk out through the door first.

### 4. Guard dashboard ([dashboard/](../frontend/src/dashboard/))

- **Privacy rule:** the guard sees the **tap place and time only while an alert is open** for that unit ("Not back yet", "Tapped in, no activity", Unusual Inactivity or Unresolved Concern). Hide them again once the incident closes. On normal days the guard sees only the status, e.g. "Possible Away".
- Show the last tap in the incident panel, e.g. "Last tap: Block A lift lobby · Out · 10:12".
- Make **"Not back yet"** look different from **"Inactive at home"**. Its steps are: call her, check CCTV, search the township. Don't start with knocking on the door.

### 5. Caregiver app ([caregiver/](../frontend/src/caregiver/))

- Home tab: "Mum went out at 10:12" and "Back at 11:40". The family sees times only, never which gate.
- During an away period the family set, if she taps **in**: "Mum is back. End the away period?" with one-tap confirm.
- Activity History: add a row for card taps ([HistoryView.tsx](../frontend/src/caregiver/HistoryView.tsx), see [phase2.md](../phase2.md) section 5).
- New incident text for "Not back yet" and "Tapped in, no activity" in [copy.ts](../frontend/src/caregiver/copy.ts).
- Optional: "Link access card" in Settings. Optional: a "hasn't been out for X days" nudge in the Together tab.

### 6. Docs

- [docs/detection-rules.md](detection-rules.md): add the card-home rules.
- [faq.md](../faq.md) question 5: card homes need no door sensor.
- [appendix.md](../appendix.md): device list (2 devices for card homes instead of 3) and the new alert types.
- `demo-instructions.md`: the two new scenarios.

## Before you call it done

- `cd frontend && npx tsc -b && npx oxlint src`
- `cd frontend && node --test src/home/**/*.test.mjs`
- Backend tests: `cd backend && source .venv/bin/activate && pytest`
- Play all 6 scenarios in `/simulator` with the caregiver and dashboard tabs open. Check that the right status or alert shows up at the right time.
- Play them in mock mode too (no backend running).
- Push to `feature/access-card`. **Do not merge into `main`.**
