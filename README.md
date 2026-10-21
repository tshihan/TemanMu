# TemanMu – Getting Started

How to run the backend (FastAPI + Supabase) and the frontend (React + Vite) locally, on **macOS/Linux** or **Windows**.
More detail: [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).

Commands are shown for both platforms. On Windows use **PowerShell** (not cmd), and run each command on its own line (older PowerShell 5.1 doesn't support `&&`).

## Prerequisites

| Tool | macOS / Linux | Windows |
| --- | --- | --- |
| **Python 3.11+** | `python3 --version` (if older, use `python3.11`) | Install from [python.org](https://www.python.org/downloads/windows/) and tick **"Add python.exe to PATH"**. Check with `py --version` |
| **Node.js 20+** and npm | [nodejs.org](https://nodejs.org) or `brew install node` | Install the LTS from [nodejs.org](https://nodejs.org). Check with `node -v` |
| **Git** | usually preinstalled | [git-scm.com](https://git-scm.com/download/win) |

You also need the **Supabase connection string / database password**. Ask the team lead

## 1. Backend

**macOS / Linux**

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

**Windows (PowerShell)**

```powershell
cd backend
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

> If activation fails with *"running scripts is disabled on this system"*, run this once, then activate again:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
> (Or use cmd: `.venv\Scripts\activate.bat`.)

### Set up `backend/.env`

Open `backend/.env` in your editor and set `DATABASE_URL`. Everything else can stay at its default.

```env
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
GRACE_PERIOD_SECONDS=15
REMINDER_INTERVAL_SECONDS=15
VOICE_CALL_RING_SECONDS=2
CONTROLLABLE_UNIT_ID=A-105
SEED_FILE=../shared/seed.json
CORS_ORIGINS=http://localhost:5173
DEMO_TIMEZONE=Asia/Kuala_Lumpur
```


### Run the backend

With the venv activated, inside `backend/` (same on both platforms):

```bash
python -m app.db.migrate                     # create tables (first time only, safe to re-run)
uvicorn app.main:app --port 8000             # single worker, do NOT add --workers
```

Then, in a **second terminal**, load the demo data (this is also what "Reset demo" does):

```bash
# macOS / Linux
curl -X POST localhost:8000/api/demo/reset
```

```powershell
# Windows PowerShell  (plain "curl" is an alias for Invoke-WebRequest there)
Invoke-RestMethod -Method Post http://localhost:8000/api/demo/reset
# or: curl.exe -X POST http://localhost:8000/api/demo/reset
```

API docs: http://localhost:8000/docs

## 2. Frontend

```bash
cd frontend
npm install
```

### Set up `frontend/.env.local`

Create a file named `.env.local` inside `frontend/` with this content:

```env
VITE_USE_MOCK=false
```

- `VITE_USE_MOCK=false` → talks to the real backend (needs step 1 running).
- `VITE_USE_MOCK=true` (or no file) → self-contained mock data, no backend needed.

Easiest is to create it in VS Code. From the terminal instead:

```bash
# macOS / Linux
echo "VITE_USE_MOCK=false" > .env.local
```

```powershell
# Windows PowerShell (use -Encoding ascii; the default can write a file Vite can't read)
Set-Content -Path .env.local -Value "VITE_USE_MOCK=false" -Encoding ascii
```

In dev you don't need any other variable: Vite proxies `/api` and `/ws` to `localhost:8000`
(see `frontend/vite.config.ts`), so opening the app from a phone on the same Wi-Fi works too.

Only for a separately hosted frontend, also set these at build time:

```env
VITE_API_BASE_URL=https://your-backend-host
VITE_WS_URL=wss://your-backend-host/ws
```

Restart Vite after changing `.env.local`.

### Run the frontend

```bash
npm run dev
```

With `VITE_USE_MOCK=false` in `.env.local` this uses the real backend.

**Phone on the same Wi-Fi:** expose the dev server on your LAN with

```bash
npm run dev -- --host
```

> **Windows:** don't use `npm run dev:live` – it sets the variable with `VITE_USE_MOCK=false vite ...`, which only works on macOS/Linux. Use `npm run dev` with `.env.local` as above.
> For phone access, also allow Node.js through Windows Firewall when prompted (choose **Private networks**), and use your PC's IP from `ipconfig` (IPv4 Address).

Open:

- http://localhost:5173 – Township / Caregiver dashboard
- http://localhost:5173/caregiver – caregiver mobile view (on a phone: `http://<your-computer-LAN-IP>:5173/caregiver`)
- Use **Presenter simulator ↗** in the dashboard to open the 3D home demo

## Quick start (two terminals)

**macOS / Linux**

```bash
# Terminal 1 – backend
cd backend && source .venv/bin/activate
python -m app.db.migrate && uvicorn app.main:app --port 8000

# Terminal 2 – frontend
cd frontend && npm run dev:live
```

**Windows (PowerShell)**

```powershell
# Terminal 1 – backend
cd backend
.venv\Scripts\Activate.ps1
python -m app.db.migrate
uvicorn app.main:app --port 8000

# Terminal 2 – frontend
cd frontend
npm run dev
```

Then once, load demo data (see "Run the backend" above for the command for your OS).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Field required ... database_url` | `backend/.env` is missing or has no `DATABASE_URL` |
| Connection refused / timeout | Wrong host/port, Supabase project paused, or no internet. Use the session pooler on 5432 |
| `password authentication failed` | Wrong password or special characters not URL-encoded |
| "Database has no tables" warning | Run `python -m app.db.migrate` |
| "no seed data" / `GET /api/units` returns `[]` | Call `POST /api/demo/reset` |
| Browser CORS error | Add the page's origin to `CORS_ORIGINS` in `backend/.env`, restart backend |
| Frontend shows no data in live mode | Backend not running or not reset/seeded; check `VITE_USE_MOCK=false` and restart Vite |
| Supabase suddenly unreachable | Free projects pause after ~1 week idle – unpause in the dashboard |
| **Windows:** `python` / `py` not found | Reinstall Python with "Add to PATH" ticked, or reopen the terminal |
| **Windows:** `Activate.ps1` is blocked | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use `.venv\Scripts\activate.bat` in cmd |
| **Windows:** `VITE_USE_MOCK is not recognized` | You ran `npm run dev:live`; use `npm run dev` with `frontend/.env.local` |
| **Windows:** `.env.local` seems ignored | It was saved as UTF-16 or as `.env.local.txt`. Re-create it as plain UTF-8/ASCII and turn on "File name extensions" in Explorer to check |
| **Windows:** phone can't reach the dev server | Run `npm run dev -- --host`, allow Node.js in Windows Firewall (Private), same Wi-Fi |
