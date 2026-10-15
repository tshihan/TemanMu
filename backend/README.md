# TemanMu Backend

FastAPI + Supabase (Postgres) backend for the TemanMu prototype. The API contract is
[PRD section 8](../temanmu-prd.md#8-api-contract); interactive docs are at
`http://localhost:8000/docs` once it runs.

## Prerequisites

- **Python 3.11+.** Check with `python3 --version`; if it says 3.10 or older, use `python3.11`
  explicitly in the commands below.
- **A Supabase project.** The backend connects straight to its Postgres database with one
  connection string. It does not use the Supabase project URL or API keys.

## Setup

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Then set `DATABASE_URL` in `backend/.env`:

1. Supabase dashboard → **Connect** → **Direct** → **Session pooler** → copy the URI.
   The host contains `pooler.supabase.com` and the port is **5432**. Avoid "Direct connection",
   which is IPv6-only and often fails on home or venue Wi-Fi.
2. Replace `[YOUR-PASSWORD]` (brackets included) with the **database password**, which can be
   reset under Project Settings → Database.
3. URL-encode special characters in the password: `@` → `%40`, `#` → `%23`, `/` → `%2F`,
   `:` → `%3A`, `?` → `%3F`, `%` → `%25`.

Never commit `.env`; it is git-ignored. Only `.env.example` is committed.

## Run

```bash
cd backend && source .venv/bin/activate
python -m app.db.migrate                    # create tables; safe to re-run
uvicorn app.main:app --port 8000            # single worker: never add --workers
curl -X POST localhost:8000/api/demo/reset  # load shared/seed.json (also the demo's "Reset demo")
```

Open `http://localhost:8000/docs`.

- Run the migration once per Supabase project, and again whenever a new file appears in
  `app/db/migrations/`. You can also paste the SQL into the Supabase SQL editor.
- The app never seeds on startup (that would wipe a running demo on reload). If the database is
  empty, the startup log says so; call `POST /api/demo/reset`.
- Reset re-reads `shared/seed.json` every time, so seed edits apply without a restart. If the
  file is invalid, reset returns `500` with the exact problem and leaves the database untouched.
- A single worker is required: timers and WebSocket connections live in one process.

## Configuration (`backend/.env`)

| Key | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | (required) | Supabase session pooler connection string |
| `GRACE_PERIOD_SECONDS` | 15 | Grace period before notifying (production: 900) |
| `REMINDER_INTERVAL_SECONDS` | 15 | Reminder interval (production: 900) |
| `CONTROLLABLE_UNIT_ID` | A-105 | The 3D home unit; must be the one `controllable` unit in seed.json |
| `SEED_FILE` | ../shared/seed.json | Relative paths resolve from `backend/` |
| `CORS_ORIGINS` | http://localhost:5173 | Comma-separated. Add the 3D home's origin if it is served elsewhere |
| `DEMO_TIMEZONE` | Asia/Kuala_Lumpur | Local time for activity schedules and reason-line clock times |

## Tests

```bash
cd backend && source .venv/bin/activate
pytest                                       # unit tests; database tests are skipped
TEST_DATABASE_URL=postgresql://... pytest    # everything
```

Database tests call demo reset, so `TEST_DATABASE_URL` must point at a **separate** database:
a second Supabase project, or a local Postgres:

```bash
docker run --rm -d --name temanmu-test-db -p 5433:5432 -e POSTGRES_PASSWORD=pg postgres:16
TEST_DATABASE_URL=postgresql://postgres:pg@localhost:5433/postgres pytest
```

Tests refuse to run if `TEST_DATABASE_URL` equals the `DATABASE_URL` in `.env`.

## Demo-day checklist

- **Supabase free projects pause after about a week without activity.** Open the dashboard or
  run the backend the day before, and again on the morning of the demo.
- **Venue internet** (PRD §12 item 6): bring a phone hotspot. As a fallback, run Supabase
  locally with the Supabase CLI (`supabase start`, needs Docker), point `DATABASE_URL` at the
  local database it prints, then run the migration and reset.
- A reset takes about 2 seconds over the internet; the frontend should show a loading state.

## Code layout

```
app/
  main.py            app, CORS, routers, lifespan (DB pool); Backend 1 adds /ws and readings here
  settings.py        .env settings
  models.py          Pydantic models for every PRD §8.1 type (shared by both backends)
  seed.py            loads and validates shared/seed.json; activity schedule rule
  timeutil.py        utc_now(), iso(), local_hhmm()
  api/               REST routes (all under /api)
  services/          create_notification(), build_snapshot(), reset_demo(), companion features
  db/                data-access functions (see db/__init__.py), pool, migrations
  realtime/          broadcast()  (Backend 1)
  timers/            grace and reminder timers  (Backend 1)
  rules/             status rules engine  (Backend 1)
```

### For Backend 1

- Read and write the database only through `app/db/*` functions. Each takes an optional `conn`;
  pass one to group calls in a transaction (example in `app/db/__init__.py`).
- `update_incident()`: leave an argument out to keep the value; pass `None` to set it to NULL.
- Any SQL error inside a transaction aborts it; use a nested `conn.transaction()` (savepoint) if
  you need to catch one and continue.
- Create every notification with `services.notifications.create_notification()` (insert +
  broadcast). Send `services.snapshot.build_snapshot()` on WebSocket connect.
- `broadcast(event_type, data)` receives Pydantic models or lists of them; serialise with
  `model_dump(mode="json")` so timestamps come out as `...Z`.
- Only evaluate units where `controllable` is true. Background units keep their seeded state.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Field required ... database_url` on start | `backend/.env` is missing or has no `DATABASE_URL` |
| `Connection refused` / timeout on start | Wrong host or port, the project is paused, or no internet. Use the session pooler on 5432 |
| `password authentication failed` | Wrong database password, or special characters not URL-encoded |
| Startup warns "Database has no tables" | Run `python -m app.db.migrate` |
| Startup warns "no seed data" / `GET /api/units` is `[]` | Call `POST /api/demo/reset` |
| Browser shows a CORS error | Add the page's origin to `CORS_ORIGINS` and restart |
| VS Code: "Import pydantic could not be resolved" | Command palette → Python: Select Interpreter → `backend/.venv/bin/python` |
