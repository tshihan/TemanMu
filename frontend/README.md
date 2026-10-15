# TemanMu frontend

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
- `src/mocks/api.ts`: seed-backed implementation of the same API interface, including mock WebSocket events and contract-shaped responses.
- `src/api/store.ts`: shared React state updated by `snapshot`, `unit.updated`, `incident.updated`, and `notification.created` events.
- `src/App.tsx`: Phase 2 split-screen shell and role switcher. The left `home-stage` is the replacement point for the 3D scene.
- `src/dashboard/TownshipView.tsx`: Township flow from four-floor overview to six illustrated Floor 1 homes, then a unit's status reason, quiet-gap progress, utility timelines and incident summary.
- `src/dashboard/HomeIllustration.tsx`: reusable SVG home art, tinted by unit status.

The mock currently models data operations and a morning reassurance event. In mock mode, **Preview water use** sends readings and creates a Caregiver notification so the inactive-role badge can be checked. **Reset preview** clears that data after confirmation. Timed safety scenarios and the visual home belong to later phases. Keep the shared types, backend contract, and mock implementation in sync when changing endpoints.

All six seeded units are shown on Floor 1, as the first-round frontend assumption. Floors 2–4 are visible but have no enrolled homes in this prototype. The API has no floor field yet; add one to the shared contract and seed if homes are later distributed across floors.

The divider supports pointer dragging, Left/Right arrow keys, and double-click or Home to reset. Its position is saved in browser storage. Both panels scroll internally at the PRD's 1366×768 minimum viewport.

## Checks

```sh
npm run build
npm run lint
```
