# TemanMu frontend implementation

**Purpose:** A shared build plan for the hackathon frontend team. The product requirements and API contract are in [temanmu-prd.md](temanmu-prd.md); this document sets the order of frontend work and the handoff between the dashboard and the separate 3D viewer.

## What we are building

The product dashboard opens by default and switches between **Township Operator** and **Caregiver**. The 3D home is a separate **Presenter Simulator** tab, clearly labelled as a demo input tool. Both tabs share the same API session, so simulator readings appear on the dashboard. The dashboard reads water, electricity and front-door data for six enrolled homes, A-101 through A-106. A-105 is the controllable home.

The **3D viewer is a reusable component** mounted only in the presenter tab. Missions 1–4 supply the furnished scene, animated resident, interactive objects and automated 3D scenarios. Mission 5 connects the viewer's sensor changes, meter, reset and companion phone to the shared frontend API and event store. In mock mode a SharedWorker owns the session across tabs; in live mode both tabs use backend REST and WebSocket. Backend-owned status rules remain outside the viewer; live ingestion and WebSocket handlers are not yet present in this repository.

For the current Township navigation, the housing block has four visible floors. Only **Floor 1** opens; it contains all six enrolled homes. Floors 2–4 show no enrolled homes. The API has no `floor` field yet, so this is a frontend demo assumption. Add a shared floor field to the seed and API before distributing units across floors.

## Phase status

| Phase | Deliverable | Current state |
| --- | --- | --- |
| 1. Foundation | App scaffold, shared types, mock and live data clients | Built; build, lint and browser smoke check passed |
| 2. App shell | Separate product dashboard and presenter simulator tabs, role switcher and notification badge | Built; two-tab mock reading sync browser checked |
| 3. Township view | Floors → illustrated homes → unit detail | Built against seed/mock data; live safety transitions still depend on the backend |
| 4. Caregiver and incident flow | Caregiver safety view and shared response actions | Built and browser checked in mock mode |
| 5. 3D viewer handoff | Embed and connect the separately built viewer | Mission 5 frontend bridge built and mock browser checked; live backend handlers pending |
| 6. Backend integration | Replace mocks with live REST/WebSocket data | Pending backend safety endpoints |
| 7. Companionship, polish and demo QA | Normal-day features and full demo run | Pending |

## Phase 1 — Foundation

**Build:** React + TypeScript + Vite + Tailwind app; types matching PRD section 8 and backend models; a REST client; a reconnecting WebSocket client; a shared state store; and a mock API backed by `shared/seed.json`. `VITE_USE_MOCK=true` runs without FastAPI or Supabase.

**Handoff:** UI components use `frontend/src/api/index.ts`, never direct `fetch` calls or direct Supabase access. Contract changes update the backend, frontend types and mock layer together.

**Done when:** A fresh install starts locally, shows the six seeded units, and `npm run build` and `npm run lint` pass. **Current status:** done. The mock now also simulates the timed safety lifecycle for Phase 4.

## Phase 2 — App shell

**Build:** A product dashboard with Township/Caregiver tabs and an unread badge on the inactive role, plus a separate presenter tab for the simulator. Keep both views usable at 1366×768 and let content scroll internally.

**Done when:** Switching roles changes the product view, a new inactive-role notification shows a badge until that role is viewed, and the simulator is clearly separate. **Current status:** done. The mock API is shared across tabs through a SharedWorker; a tap action in the presenter tab updated A-105's water timeline and caregiver badge in the already-open dashboard tab.

## Phase 3 — Township view

**Build:** Show four floors first. Floor 1 opens a grid of six illustrated home cards, each with unit ID, resident and text status. Selecting a home opens its status reason, water quiet-gap progress against its baseline, water/electricity/door timelines, and an incident summary. Put Unresolved Concern homes first and identify A-105 as the simulated home. Status must be understandable without colour alone.

**Done when:** The user can navigate Floors → Floor 1 homes → Unit detail and back; A-105's timeline updates after a reading; the layout remains usable at 1366×768. **Current status:** done against seed/mock data. A live backend will supply timed status changes and incidents in Phase 6. Phase 4 added shared incident actions to this view.

## Phase 4 — Caregiver and incident flow

**Build:** Complete the Caregiver safety view: resident status, morning reassurance, alert and reminder feed, and a simulated “Call Mum” action. Build incident components once for both roles: grace countdown, event timeline, “I'll Check Now”, acknowledgement identity, outcome selection, closure and resolved state. Show the other role's acknowledgement and outcome through shared state. Handle API conflicts such as an incident already acknowledged or a different actor trying to close it.

Extend mock scenarios so the dashboard can demonstrate detection → grace → notification → reminder → acknowledgement → closure, plus auto-resolution, before the live backend is ready. Use server deadlines and baseline values for displayed durations; do not hard-code demo timings in components.

**Done when:** Both roles can follow and act on one mock incident, a new alert is visible in the inactive-role badge, reminders stop after acknowledgement, and both views show the same outcome.

**Current status:** Built in mock mode. The Caregiver view includes a chronological activity timeline above incident response, based on reassurance notifications and status changes received during the current tab session. Earlier dashboard-only mock scenario buttons were removed from the product view to keep presenter controls separate. After a 3D collapse, a presenter-only mock command starts a simulated quiet-gap detection and grace period in the SharedWorker; live mode still waits for backend events. Mock state and timers live in the SharedWorker while at least one app tab remains open; backend-owned timers and persistence are Phase 6.

## Phase 5 — Separate 3D viewer handoff

**Viewer owner builds separately:** The furnished home scene is embedded in the presenter tab. Mission 2 adds Madam Lee's rigged avatar, idle/walk animation and room-to-room movement. Mission 3 adds clickable tap, kettle, door and telephone interactions, plus local test controls. Mission 4 adds scripted Normal Morning, Going Out, Unusual Inactivity and False Alarm Recovery sequences with pause/resume/stop/reset. Mission 5 sends sensor-object changes through the shared API and reads confirmed values from the shared store. The character is audience-only and never sends movement data.

**Frontend team integrates:** The viewer is mounted in the presenter view and posts A-105 sensor changes through the shared API client. Both tabs receive snapshots, readings, unit/incident changes and `companion.message_delivered`; the viewer calls demo reset after confirmation. The meter and scenario progress reflect API data, while the permanent audience-only privacy label remains visible. The remaining live handoff needs Backend 1's missing reading ingestion, WebSocket broadcaster and monitoring rules; no 3D code assigns a status or incident.

**Done when:** A tap, kettle or door action changes the A-105 meter readout and dashboard through the API, reset restores both tabs, and the viewer fits the presenter view at the demo screen sizes.

## Phase 6 — Live backend integration

**Build:** Set `VITE_USE_MOCK=false` and connect the frontend to FastAPI REST and `/ws`. Load a snapshot on connection, apply subsequent unit/incident/notification events, reconnect automatically, and replace local state with a new snapshot after reconnect or reset. Fetch selected-unit reading and incident history from REST. Keep Supabase behind the backend.

**Done when:** The four PRD scenarios run end to end on one laptop: Normal Morning, Going Out, Unusual Inactivity, and False Alarm Recovery. Check that the quiet-gap bar, grace countdown, reason line, both role notifications and incident state follow backend data. Verify errors and disconnected state are visible rather than silently ignored.

## Phase 7 — Companionship, polish and demo QA

**Build:** Add the community activity card and response actions, preset “thinking of you” messages and simulated delivery, and Community Buddy request/match. Then finish incident history, light/dark theme, mute and optional sounds, and the final UI design pass. Sound must never be required to understand an alert. Keep English copy and visible “simulated” labels for calls and matches.

**Done when:** The team can show both the safety story and a normal-day wellbeing story. Run the full presentation sequence at 1920×1080 and 1366×768, check every control and role transition, refresh/reconnect, and reset before each judge. Record separately what was verified in mocks, with the live backend, and in the final 3D viewer.

## Run and key files

```sh
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` for the product dashboard, then open **Presenter simulator ↗** in a second tab. Mock mode is the current default and shares one session across tabs in the same browser profile and origin. To use the real backend, copy `frontend/.env.example` to `frontend/.env.local`, set `VITE_USE_MOCK=false`, start FastAPI on port 8000, then restart Vite.

| Area | File |
| --- | --- |
| App shell and separate views | `frontend/src/App.tsx` |
| Furnished 3D viewer | `frontend/src/home/HomeEnvironment.tsx` |
| Township navigation and detail | `frontend/src/dashboard/TownshipView.tsx` |
| Caregiver status and notification feed | `frontend/src/dashboard/CaregiverView.tsx` |
| Shared incident response | `frontend/src/dashboard/IncidentPanel.tsx` |
| Dashboard visual theme | `frontend/src/theme.css` |
| Reusable home artwork | `frontend/src/dashboard/HomeIllustration.tsx` |
| Shared contract types | `frontend/src/api/types.ts` |
| Mock and live clients | `frontend/src/mocks/api.ts`, `frontend/src/api/live.ts` |
| Shared mock tab session | `frontend/src/mocks/shared-worker.ts`, `frontend/src/mocks/shared-client.ts` |
| Shared realtime state | `frontend/src/api/store.ts` |
| Seed fixtures | `shared/seed.json` |

The [frontend README](frontend/README.md) has current setup and implementation notes. The PRD remains the source of truth for feature priorities, status rules, event names, API payloads and demo scenario steps.
