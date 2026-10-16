# Mission 6 demo readiness check

Checked on 16 October 2026 against a fresh production build (`npm run build && npm run preview`) in local Chrome with the shared mock API. The current presentation design puts the simulator and dashboard in separate tabs; the older brief's split-screen/left-half requirement was superseded by that decision.

## Improvements and fixes

- Increased Madam Lee's normal route speed from 0.57 to 1.0 m/s and matched the walk clip playback to it. False Alarm Recovery uses a 1.6× urgency multiplier. Waypoint routes and sensor writes are unchanged.
- Added a compact scenario card showing scenario, current action, step and playback state. Stopping or failing a scenario clears the stale action. The developer-only Interaction Test starts collapsed, leaving all four scenario buttons visible at 1366×768.
- When realtime is disconnected, the meter identifies retained values as **last confirmed** and reports the mock/live connection state accurately.
- The existing warm dollhouse scene was visually checked at 1366×768 and 1920×1080. No floor-plan, lighting or material overhaul was needed.

## Scenario and control results

| Check | Result | Evidence or limit |
| --- | --- | --- |
| 1. 3D house loads | PASS | Production build rendered the full house at both target viewport sizes; no browser console errors. |
| 2. Character loads and walks | PASS | Madam Lee loaded and completed the authored Normal Morning and Going Out routes. Frame-by-frame foot contact was not instrumented. |
| 3. Tap reading | PASS | Normal Morning produced confirmed water 6.0 then 0.0 L/min readings. |
| 4. Kettle reading | PASS | Normal Morning produced confirmed power 1.80 then 0.15 kW readings. |
| 5. Door reading | PASS | Going Out produced open, closed, open, closed readings and finished with the door closed. This verifies sensor events, not away-state inference. |
| 6. Telephone delivery event | NOT TESTED | The manual Incoming Call animation rang and returned to idle without a sensor reading. A `companion.message_delivered` event was not injected in this run. |
| 7. Normal Morning | PASS | Completed all 12 steps with expected water/electricity transitions. |
| 8. Going Out | PASS | Completed all 12 scene steps and four door transitions. Live backend outing classification remains untested. |
| 9. Unusual Inactivity | PASS | A later browser run showed the quiet period, explicit mock time jump, call/no-answer stage while the incident was still in grace, then caregiver alert and `unresolved_concern`/`notified`. No household reading was produced. The newly opened dashboard showed one caregiver notification. Live monitoring remains untested. |
| 10. False Alarm Recovery | PASS | Mock incident entered grace and auto-resolved after a confirmed 6.0 L/min water reading before the configured 15-second deadline; all 10 steps completed after the explicit quiet-gap step. |
| 11. Pause, resume, stop | PASS | Playback state changed to Paused, Running and Stopped; scenario buttons were disabled during playback. |
| 12. Reset | PASS | Confirmed reset restored ready state, bedroom position and baseline sensor values after Going Out, after recovery, and during an active scenario. Other intermediate animation poses were not individually exercised. |
| 13. Rapid repeated interactions | NOT TESTED | Scenario buttons were confirmed disabled during playback, but simultaneous manual object clicks were not stress-tested. |
| 14. WebSocket reconnection | NOT TESTED | No live WebSocket server was running. |
| 15. Current presentation sizes | PASS | Simulator and controls were visually checked at 1366×768 and 1920×1080 in the separate-tab layout. The superseded half-panel layout was not tested. |

Build and code checks: `npm run build`, `npm run lint`, `git diff --check`, and the five frontend navigation/sensor gateway tests passed. Backend tests: 45 passed, 27 database-dependent tests skipped because `TEST_DATABASE_URL` was not supplied. The production 3D bundle is about 1.09 MB before compression; Vite reports its large-chunk advisory. No frame-rate or GPU-memory measurement was taken, so no FPS target is claimed.

## Backend and door interpretation

The browser results above used the SharedWorker mock API. The FastAPI app still lacks the `POST /api/readings` and `/ws` handlers, so live ingestion, live sensor decisions, disconnection/reconnection and live incident recovery are not verified. The 3D collapse is audience animation only; in mock mode, a presenter-only time jump opens the mock quiet-gap incident after a visible quiet period. An open door, Possible Away status or active utility use blocks that mock trigger; a historical door event alone does not. The mock requires a recorded no-answer event before creating caregiver and township alerts. The character sends no movement data. A later browser run reproduced Normal Morning followed by Unusual Inactivity and observed the simulated call stage and eventual notified incident without a stall.

Follow-up check: the extended Unusual Inactivity scene reached step 14 with Guard Ali visible beside Madam Lee, the confirmed sensor meter still at 0.0 L/min / 0.15 kW / CLOSED, and no browser errors. The Township incident timeline showed `notified` followed by `acknowledged · Guard Ali`; it remained open for a human outcome. The responder is a procedural presenter character, not a detection source or real dispatch confirmation.

The door sensor reports opening and closing, not whether a resident crossed the threshold. The Going Out scene sends real door transitions through the existing API, but the current mock reading handler does not infer an outing from those transitions. A separate developer-only mock scenario sets Possible Away directly. Do not present a brief door opening as confirmed departure. A future backend rule should treat it as **door activity** and only label **possible** away after a resident-specific interval without other household activity, with human confirmation for consequential action. That rule belongs to backend product design, outside this Mission 6 simulator polish.

## Run the demo

From `frontend`: `npm install && npm run dev`. Open the Vite URL in one browser profile, keep the Product Dashboard tab open, and use **Presenter simulator ↗** for the separate demo tab. For a production build check, run `npm run build && npm run preview`. Mock mode is the default and needs no backend. Select **Reset Demo** before a new judging run.
