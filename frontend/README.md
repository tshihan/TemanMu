# TemanMu frontend

> **Presentation layout:** The Township/Caregiver dashboard is the default product view. The furnished 3D home is a separate Presenter Simulator for demonstration only. Both tabs use the same API session, so confirmed A-105 sensor readings appear on the dashboard. See [home viewer documentation](src/home/README.md) for integration behavior and current backend limits.

React, TypeScript, Vite and Tailwind frontend for the TemanMu prototype.

## Run

```sh
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` for the product dashboard, then use **Presenter simulator ↗** to open the 3D demo in another tab. The app uses `../shared/seed.json` and a shared in-memory mock session by default, so the backend is not required. The mock session lasts while at least one app tab remains open; **Reset Demo** clears it in all tabs. Open both views under the same browser origin and profile.

To connect the real backend, copy `.env.example` to `.env.local`, set `VITE_USE_MOCK=false`, and start the FastAPI app. Vite must be restarted after changing environment variables. The frontend uses `VITE_API_BASE_URL` and `VITE_WS_URL` in live mode.

## Structure

- `src/api/types.ts`: types matching PRD section 8 and `backend/app/models.py`.
- `src/api/live.ts`: typed REST client and reconnecting WebSocket client. A new `snapshot` replaces local state.
- `src/mocks/api.ts`: seed-backed implementation of the same API interface, including mock WebSocket events, timed incident transitions and contract-shaped responses.
- `src/mocks/shared-worker.ts` and `shared-client.ts`: one mock API session shared by dashboard and simulator tabs through a SharedWorker.
- `src/api/store.ts`: shared React state updated by `snapshot`, `unit.updated`, `incident.updated`, and `notification.created` events.
- `src/App.tsx`: product dashboard by default, separate `#simulator` presenter view, and Township/Caregiver role switcher.
- `src/dashboard/TownshipView.tsx`: Township flow from four-floor overview to six illustrated Floor 1 homes, then a unit's status reason, quiet-gap progress, utility timelines and shared incident response.
- `src/dashboard/CaregiverView.tsx`: resident status, chronological activity timeline, simulated call and notification feed.
- `src/dashboard/IncidentPanel.tsx`: shared countdown, timeline, acknowledgement and outcome actions for both roles.
- `src/theme.css`: shared parchment, terracotta and editorial typography styling for the dashboard.
- `src/dashboard/HomeIllustration.tsx`: reusable SVG home art, tinted by unit status.

The 3D viewer's sensor actions use the same API interface as the dashboard. In mock mode, one SharedWorker owns readings, incidents, notifications and timers for all open app tabs. The simulator's **Reset Demo** clears the shared session. After a 3D collapse, a presenter-only mock command starts the simulated quiet-gap detection and grace period, so the dashboard can show the incident in either tab. Live mode waits for backend detection; live ingestion and WebSocket handlers remain pending. Keep the shared types, backend contract and mock implementation in sync when changing endpoints.

All six seeded units are shown on Floor 1, as the first-round frontend assumption. Floors 2–4 are visible but have no enrolled homes in this prototype. The API has no floor field yet; add one to the shared contract and seed if homes are later distributed across floors.

The dashboard and simulator each fill their own tab. The product dashboard has no 3D house or presenter controls.

## Checks

```sh
npm run build
npm run lint
```
