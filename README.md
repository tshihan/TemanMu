<p align="center">
  <img src="frontend/public/icons/icon-512.png" alt="TemanMu logo" width="120" />
</p>

<h1 align="center">TemanMu</h1>

<p align="center"><strong>Reassurance at home. Connection in the community.</strong></p>

TemanMu looks after older people who live alone, using only the water, electricity and front-door activity in their home. No cameras, no wristbands, no app for the older person to learn.

If their usual routine suddenly stops, TemanMu gets a real person to check on them quickly. On ordinary days, it sends the family a calm "Mum's day has started" message and helps the resident meet people nearby.

> Built by team **Albert & Einstein** (Universiti Malaya) for the **Sime Darby Property Township of Tomorrow 2026** hackathon.

🌐 **[Live demo](https://temanmu-nine.vercel.app/)** · 🎬 [Pitch slides](https://temanmu-nine.vercel.app/slides) · 📄 [Product requirements](temanmu-prd.md) · ❓ [FAQ](faq.md)

---

## The problem

When someone lives alone, a quiet house could mean they are asleep, out, or lying on the floor needing help. In Malaysia, the share of people aged 60+ living alone rose from **6.3% (2018)** to **18.8% (2025)**, and **14.1%** had a fall in the past year (NHMS).

Cameras feel intrusive, wearables get forgotten or taken off, and simple meter alerts use one fixed rule for everyone, causing false alarms with no clear plan for who goes to check.

## How it works

TemanMu has two parts: **Safety** for the rare bad day, and **Companion** for every ordinary day.

### 1. Safety: notice when a routine breaks

**Sensors notice. TemanMu checks. People respond.**

1. **Learns each resident's own routine** from water (main sign of life), electricity (confirms someone is active) and the front door (explains outings).
2. **Notices when today looks very different**, for example no water used for far longer than *her* usual quiet gap.
3. **Calls the resident first.** Any tap, kettle or door activity cancels the alert.
4. **Alerts family and township guard together** if there is still no sign of activity, with reminders until someone taps **"I'll Check Now"**.
5. **Every alert ends with a recorded outcome.** A human always decides; TemanMu never calls 999 by itself.

| Status | Meaning |
| --- | --- |
| **Routine** | Normal activity. Family gets a morning reassurance message |
| **Possible Away** | Door opened, then the home went quiet. No alert while within her usual outing time |
| **Unusual Inactivity** | Quiet for much longer than usual. Grace period starts and she is called |
| **Unresolved Concern** | No answer, no activity. Family and guard alerted |

### 2. Companion: support on ordinary days

Most days nothing goes wrong, and TemanMu still helps the family stay close and the resident stay connected:

- **Morning reassurance.** The family gets "Mum's day has started" when the first water or electricity use of the day is seen.
- **Mum's day at a glance.** A simple 24-hour timeline of water, power and door activity.
- **Community activities.** The family can see what's happening nearby (gardening, tai chi, cooking classes) and invite Mum or join her.
- **Community Buddy.** Request a local volunteer who shares Mum's interests, such as a gardening buddy.
- **Same-hour neighbours.** With consent from both sides, TemanMu suggests a neighbour whose day naturally overlaps with Mum's. A community coordinator makes the introduction in person, and exact times are never shared.

The resident stays tech-free: the family acts on their behalf, and anything that reaches the resident comes through a real person.

### Privacy

TemanMu TemanMu only sees *how much* water and electricity is used and *whether* the front door opened. Nothing is tracked room by room.

---

## The prototype

Real meters are not installed yet, so a **3D simulated home** stands in for one. Clicking the tap, kettle or door sends the same data a real meter would; everything after that (rules, timers, alerts, dashboard, family app) runs live.

| Page | Address | Who it represents |
| --- | --- | --- |
| Landing page | `/` | Overview and links |
| Live 3D view | `/simulator` | Madam Lee's home (A-105), with clickable sensors and one-click scenarios |
| Township dashboard | `/dashboard` | Guard Ali's view of Block A |
| Caregiver app | `/caregiver` | Her daughter Sarah's phone (installable PWA) |
| Pitch slides | `/slides` | Our presentation |

Try it at **https://temanmu-nine.vercel.app/**. All pages share one live state, so open them side by side. The 3D view has four one-click scenarios: **Normal Morning**, **Going Out**, **Unusual Inactivity** and **False Alarm Recovery** (timings shortened from hours to seconds).


---

## Run it

### Quick try (no backend needed)

Needs [Node.js 20+](https://nodejs.org). Runs with built-in sample data.

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

### Full setup (backend + Supabase)

Needs Python 3.11+, Node.js 20+ and a Supabase connection string (team members: ask the team lead).

After copying `.env.example` to `.env`, set `DATABASE_URL` in `backend/.env` (use the Supabase session pooler, port 5432).

#### macOS / Linux

```bash
# Terminal 1: backend
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # then set DATABASE_URL
python -m app.db.migrate
uvicorn app.main:app --port 8000  # single worker, do not add --workers

# Terminal 2: load demo data
curl -X POST localhost:8000/api/demo/reset

# Terminal 3: frontend
cd frontend
npm install
echo "VITE_USE_MOCK=false" > .env.local
npm run dev
```

#### Windows (PowerShell)

```powershell
# Terminal 1: backend
cd backend
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env            # then set DATABASE_URL
python -m app.db.migrate
uvicorn app.main:app --port 8000  # single worker, do not add --workers

# Terminal 2: load demo data
Invoke-RestMethod -Method Post http://localhost:8000/api/demo/reset

# Terminal 3: frontend
cd frontend
npm install
Set-Content -Path .env.local -Value "VITE_USE_MOCK=false" -Encoding ascii
npm run dev
```

> **Windows notes:** if activation fails with *"running scripts is disabled"*, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once. Keep `-Encoding ascii` when creating `.env.local`, or Vite may not read it. Don't use `npm run dev:live`, which only works on macOS/Linux.

Then open http://localhost:5173.

To open the caregiver app on your phone, run `npm run dev -- --host` and visit `http://<your-computer-LAN-IP>:5173/caregiver` on the same Wi-Fi.

More detail and troubleshooting: [backend/README.md](backend/README.md).

### Tech stack

| Layer | Technology |
| --- | --- |
| Frontend (all pages) | React 19, Vite, TypeScript, Tailwind CSS |
| Caregiver app | Same frontend, installable as a PWA (`vite-plugin-pwa`) |
| 3D home | Three.js with React Three Fiber and Drei, Microsoft Rocketbox avatars |
| Backend | Python 3.11+, FastAPI, `uvicorn` (single worker) |
| Real-time updates | FastAPI WebSocket |
| Timers | Server-side `asyncio` tasks, so alerts keep running even with every browser closed |
| Database | Supabase (Postgres), accessed only by the backend |
| Hosting | Vercel (frontend) |

The status rules engine ([backend/app/rules/engine.py](backend/app/rules/engine.py)) is pure logic with no database or network code, so real meter data can replace the 3D simulator without changing the backend.

---

## Team

**Albert & Einstein**, Universiti Malaya

| Name | Role |
| --- | --- |
| Tan Shi Han | Team Leader & Project Manager |
| Lim Jing Jet | Legal & Sustainability Consultant |
| Khor Hong Jun | Frontend Engineer |
| Cho Jing Ling | Backend Engineer |
| Lee Yang | Sales & Marketing |

## Credits

- Data: [NHMS 2018](https://iku.nih.gov.my/images/IKU/Document/REPORT/NHMS2018/FactsheetElderlyAged60yearsorMorefinal.pdf), [NHMS 2025 Key Findings](https://iku.nih.gov.my/images/nhms-2025/infographic-eng.pdf), [NHMS 2025 Volume II](https://iku.nih.gov.my/images/nhms-2025/nhms-2025-volume-2.pdf)
- 3D characters based on [Microsoft Rocketbox avatars](https://github.com/microsoft/Microsoft-Rocketbox) (MIT). See `frontend/public/models/`.

All residents, families, volunteers and units in the demo are fictional.
