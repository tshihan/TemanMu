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

To connect the caregiver app to the real backend, start FastAPI as described in `../backend/README.md`, migrate and seed its database, then run `npm run dev:live`. Open `http://localhost:5173/#caregiver` (or the same frontend URL using your computer's LAN address on a phone). Vite proxies `/api` and `/ws` to FastAPI on the computer, so a phone never tries to reach its own `localhost:8000`. The backend still needs a working `DATABASE_URL`; no live data appears until its first WebSocket snapshot arrives. `npm run build:live` creates a live-mode production bundle. You can also use `.env.local` with `VITE_USE_MOCK=false`; restart Vite after changing it.

For a separately hosted frontend, set `VITE_API_BASE_URL` to the backend's HTTPS origin and `VITE_WS_URL` to its WSS `/ws` URL at build time, or configure the host to proxy `/api` and `/ws` to FastAPI. Installable PWA access from a phone also needs HTTPS. These are prototype endpoints without user authentication, so do not publish the backend to an untrusted network. Set `VITE_USE_MOCK=true` to run the self-contained demo.

## Structure

- `src/api/types.ts`: types matching PRD section 8 and `backend/app/models.py`.
- `src/api/live.ts`: typed REST client and reconnecting WebSocket client. A new `snapshot` replaces local state.
- `src/mocks/api.ts`: seed-backed implementation of the same API interface, including mock WebSocket events, timed incident transitions and contract-shaped responses.
- `src/mocks/shared-worker.ts` and `shared-client.ts`: one mock API session shared by dashboard and simulator tabs through a SharedWorker.
- `src/api/store.ts`: shared React state updated by `snapshot`, `unit.updated`, `incident.updated`, and `notification.created` events.
- `src/App.tsx`: product dashboard by default, separate `#simulator` presenter view, and Township/Caregiver role switcher.
- `src/dashboard/TownshipView.tsx`: Township flow from four-floor overview to six illustrated Floor 1 homes, then a unit's status reason, quiet-gap progress, utility timelines and shared incident response.
- `src/dashboard/CaregiverView.tsx`: resident status, chronological activity timeline built from confirmed A-105 water, electricity and door readings plus reassurance/status events, simulated call and notification feed. Opening the Caregiver view fetches earlier readings from the same API session.
- `src/dashboard/IncidentPanel.tsx`: shared countdown, timeline, acknowledgement and outcome actions for both roles.
- `src/theme.css`: shared parchment, terracotta and editorial typography styling for the dashboard.
- `src/dashboard/HomeIllustration.tsx`: reusable SVG home art, tinted by unit status.

The 3D viewer's sensor actions use the same API interface as the dashboard. In mock mode, one SharedWorker owns readings, incidents, notifications and timers for all open app tabs. The simulator's **Reset Demo** clears the shared session. After a 3D collapse, a presenter-only mock command starts the simulated quiet-gap detection and grace period, so the dashboard can show the incident in either tab. Live mode sends readings to FastAPI and receives backend detection and updates over WebSocket. Keep the shared types, backend contract and mock implementation in sync when changing endpoints.

All six seeded units are shown on Floor 1, as the first-round frontend assumption. Floors 2–4 are visible but have no enrolled homes in this prototype. The API has no floor field yet; add one to the shared contract and seed if homes are later distributed across floors.

The dashboard and simulator each fill their own tab. The product dashboard has no 3D house or presenter controls.

## Checks

```sh
npm run build
npm run lint
```
