# TemanMu frontend

> **3D home, Missions 1–4:** The furnished home, animated Madam Lee, four local household interactions and four automated 3D scenarios are embedded in the left panel of the existing app. Township and Caregiver dashboards remain on the right. Scenario playback and collapsible manual controls sit below the scene; the dashboard's separate mock controls remain under **Demo controls**. See [home viewer documentation](src/home/README.md) for camera, animation, navigation and scenario details.

React, TypeScript, Vite and Tailwind frontend for the TemanMu prototype.

## Run

```sh
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The app uses `../shared/seed.json` and its in-memory API by default, so the backend is not required. Reloading the page starts a fresh mock session.

To connect the real backend, copy `.env.example` to `.env.local`, set `VITE_USE_MOCK=false`, and start the FastAPI app. Vite must be restarted after changing environment variables. The frontend uses `VITE_API_BASE_URL` and `VITE_WS_URL` in live mode.

## Structure

- `src/api/types.ts`: types matching PRD section 8 and `backend/app/models.py`.
- `src/api/live.ts`: typed REST client and reconnecting WebSocket client. A new `snapshot` replaces local state.
- `src/mocks/api.ts`: seed-backed implementation of the same API interface, including mock WebSocket events, timed incident transitions and contract-shaped responses.
- `src/api/store.ts`: shared React state updated by `snapshot`, `unit.updated`, `incident.updated`, and `notification.created` events.
- `src/App.tsx`: split-screen shell and role switcher. The left `home-stage` mounts the 3D scene and retains the demo controls.
- `src/dashboard/TownshipView.tsx`: Township flow from four-floor overview to six illustrated Floor 1 homes, then a unit's status reason, quiet-gap progress, utility timelines and shared incident response.
- `src/dashboard/CaregiverView.tsx`: resident status, chronological activity timeline, simulated call and notification feed.
- `src/dashboard/IncidentPanel.tsx`: shared countdown, timeline, acknowledgement and outcome actions for both roles.
- `src/theme.css`: shared parchment, terracotta and editorial typography styling for the dashboard.
- `src/dashboard/HomeIllustration.tsx`: reusable SVG home art, tinted by unit status.

The dashboard's **Demo controls** are separate from the 3D viewer's Mission 4 scenario controls. In mock mode, the dashboard's four scenario buttons run **Normal morning**, **Going out**, **Unusual inactivity** and **False alarm recovery** from a fresh seed snapshot. The safety scenario shows a quiet-gap trigger, 15-second grace period, simultaneous role alerts, 15-second reminders, acknowledgement and closure. Activity can auto-resolve an incident. **Manual water use** sends a reading; **Reset preview** clears the session after confirmation. These mock timers run only while the page is open and reset on reload. The live backend and sensor interaction with the 3D objects are later phases. Keep the shared types, backend contract, and mock implementation in sync when changing endpoints.

All six seeded units are shown on Floor 1, as the first-round frontend assumption. Floors 2–4 are visible but have no enrolled homes in this prototype. The API has no floor field yet; add one to the shared contract and seed if homes are later distributed across floors.

The divider supports pointer dragging, Left/Right arrow keys, and double-click or Home to reset. Its position is saved in browser storage. Both panels scroll internally at the PRD's 1366×768 minimum viewport.

## Checks

```sh
npm run build
npm run lint
```
