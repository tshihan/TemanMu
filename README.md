<p align="center">
  <img src="frontend/public/icons/icon-512.png" alt="TemanMu logo" width="120" />
</p>

<h1 align="center">TemanMu</h1>

<p align="center"><strong>Reassurance at home. Connection in the community.</strong></p>

TemanMu looks after older people who live alone, using only their home's water and electricity use and the township access card they already carry. No cameras, no wristbands, no app for the older person to learn.

If their usual routine suddenly stops, TemanMu gets a real person to check on them quickly. On ordinary days, it lets the family know their parent's day has started, based on the first water or electricity use of the morning, and helps the resident meet people nearby.

> Built by team **Albert & Einstein** (Universiti Malaya) for the **Sime Darby Property Township of Tomorrow 2026** hackathon.
>
> **Challenge Track:** People

🌐 **[Live site](https://temanmu-ae.vercel.app/)**\
📊 [Pitch slides](https://temanmu-ae.vercel.app/final-slides)\
🎬 Pitch video: [YouTube](https://youtu.be/EnIQGYx4cZQ) / [Google Drive](https://drive.google.com/file/d/1-JXwXZXBH4tyZYcfinDL7gwo8wbGocoB/view?usp=share_link)

---

## The problem

When someone lives alone, a quiet house could mean they are asleep, out, or lying on the floor needing help. In Malaysia, the share of people aged 60+ living alone rose from **6.3% (2018)** to **18.8% (2025)**, and **14.1%** had a fall in the past year (NHMS).

Cameras feel intrusive, wearables get forgotten or taken off, and simple meter alerts use one fixed rule for everyone, causing false alarms with no clear plan for who goes to check.

## How it works

TemanMu has two parts: **Safety** for the rare bad day, and **Companion** for every ordinary day.

### 1. Safety: notice when a routine breaks

**Sensors notice. TemanMu checks. People respond.**

1. **Learns each resident's own routine** from water (main sign of life), electricity (confirms someone is active) and access-card taps at the lobby, lift or gate (explain outings).
2. **Notices when today looks very different**, for example no water used for far longer than *her* usual quiet gap.
3. **Calls the resident first.** Any water or electricity use at home cancels the alert.
4. **Alerts family and township guard together** if there is still no sign of activity, with reminders until someone taps **"I'll Check Now"**.
5. **Every alert ends with a recorded outcome.** A human always decides; TemanMu never calls 999 by itself.

| Status | Meaning |
| --- | --- |
| **Routine** | Normal activity. Family gets a morning reassurance message |
| **Possible Away** | She tapped her card out and the home went quiet. No alert while within her usual outing time |
| **Not Back Yet** | She tapped out and has been out much longer than usual. The guard looks for her outside |
| **Tapped In, No Activity** | She tapped back in, but no water or electricity was used soon after |
| **Unusual Inactivity** | Quiet for much longer than usual. Grace period starts and she is called |
| **Unresolved Concern** | No answer, no activity. Family and guard alerted |

### 2. Companion: support on ordinary days

Most days nothing goes wrong, and TemanMu still helps the family stay close and the resident stay connected:

- **Morning reassurance.** The family gets "Mum's day has started" when the first water or electricity use of the day is seen.
- **Mum's day at a glance.** A simple 24-hour timeline of water, power and card taps.
- **Community activities.** The family can see what's happening nearby (gardening, tai chi, cooking classes) and invite Mum or join her.
- **Community Buddy.** Request a local volunteer who shares Mum's interests, such as a gardening buddy.
- **Same-hour neighbours.** With consent from both sides, TemanMu suggests a neighbour whose day naturally overlaps with Mum's. A community coordinator makes the introduction in person, and exact times are never shared.

The resident stays tech-free: the family acts on their behalf, and anything that reaches the resident comes through a real person.

### Privacy

TemanMu only sees *how much* water and electricity is used and *when* her access card was tapped. There are no new devices in the home. Nothing is tracked room by room.

---

## What's new since the first round

After the first round we added seven features, mostly in answer to mentor and judge feedback.

### 1. Two models that learn her routine, adjusted to the time of day

A single fixed limit like "alert after 3 quiet hours" is too strict at night and too slow in the morning. We now train two models on Madam Lee's own history. Each one learns a separate limit **for every 15 minutes of the week**, so how long TemanMu waits depends on when the home went quiet.

| Model | What it learns | Example |
| --- | --- | --- |
| **Quiet Gap Model** | How long she normally goes without using water, based on when she last used it | Short limit after her 08:00 breakfast, longer during her usual afternoon nap, longest overnight |
| **Outing Model** | How long she is normally out, based on the time and day she taps out | 2h 20m for a 07:00 tap-out on a weekday; longer on her Tuesday/Saturday market mornings |

- Both are gradient boosting models, trained on 6 weeks and tested on the 2 weeks after. The Outing Model also adds a 55-minute safety margin, chosen using the 2 test weeks.
- The caregiver app shows the family her **usual quiet gaps** and **usual outings**, so they can see what TemanMu considers normal for her.
- The history is simulated for the demo: 8 weeks with walks, market days, a Thursday centre visit, an away weekend and two meter outages. Code and instructions are in [backend/ml/](backend/ml/README.md).

### 2. Access card replaces the door sensor

In the first round, TemanMu used a front-door sensor to explain outings. We have dropped it. Sime Darby Property townships already give residents access cards for the lobby, lift and gate, so TemanMu now uses **card taps** instead.

Why a card tap is better than a door sensor:

- **Cost.** It uses the cards and readers the township already has. There's no sensor to buy or install, and no battery to replace.
- **Identity.** A tap says *who* went through (her card), while a door sensor only says the door moved.
- **Time.** Every tap is time-stamped, and the Outing Model uses those times to learn how long she is usually out.
- **Place.** Each reader is marked as "going out" or "coming home", so a tap also shows *which way* she went and *where*. A door opening can't tell whether she left or stayed in.

New alerts that this makes possible:

- **Not back yet.** She tapped out and has been out much longer than usual. The guard looks for her *outside* instead of knocking on her door.
- **Tapped in, no activity at home.** She tapped back in, but no water or electricity was used soon after. She may have had a problem in the lift or corridor.

A tap never proves she is safe (cards get lent and taps get missed), so it never closes an alert, and any water or power use at home outweighs a tap out. The 3D simulator has a lift-lobby card reader and two new scenarios: **Not Back Yet** and **Tapped In, Home Quiet**.

### 3. Stop tracking temporarily

The family can pause monitoring from the caregiver app when Mum is away, for example staying with relatives or in hospital. They set an expected return time, and tracking resumes by itself after that (or earlier, when they tap **Resume tracking** or **Return home**). This stops a holiday from being reported as "unusual inactivity". Tracking can't be paused while an alert is still open, so an alert can't be silenced this way.

### 4. Past activity history

The caregiver app used to show only today. Now **Past 7 days** / **30 days** shows one row per day with water, power and card-tap lanes, plus bands for paused time, missing data and alerts. Tapping a day shows its details. Families can spot slow changes, such as her first water use getting later, and look back at what happened with an earlier alert.

### 5. Guard emergency access consent

Judges asked what a guard may do if no one answers the door. During onboarding the resident and caregiver sign an **Emergency Access Authorization Agreement**, which the family can view in the caregiver app under **Settings → Emergency access**. It sets clear limits:

- First try to reach the resident and caregiver, then do an outside check (doorbell, look in, call through the grille). An alert or a missed call alone is never enough to go in.
- Enter only with an agreed way in that needs no force, and only with **two guards together**, or one guard wearing a body camera that is recording.
- Guards never break doors or force locks. If something is wrong, they call **999** and Bomba or medical responders handle any forced entry.
- Every check records who went, why, how they entered, which safeguard was used and what they found.

The agreement in the demo is a sample only. It is not a signed contract.

### 6. Township dashboard in English and Bahasa Melayu

Many township guards are more comfortable in Malay. A globe 🌐 menu in the dashboard header switches all text, dates and the page language between **English** and **Bahasa Melayu**, and each browser remembers the choice. Reports always reach the family and backend in English, whichever language the guard uses.

### 7. Guard Guide

A simple printable guide for guards, [TemanMu-Guard-Guide.pdf](TemanMu-Guard-Guide.pdf) (editable version: [docs/TemanMu-Guard-Guide.docx](docs/TemanMu-Guard-Guide.docx)). It explains the dashboard with labelled screenshots and short steps: what the colours mean, how to respond to an alert (**I'll Check Now** → check the unit → **Record and close**), when to press **Call 999**, and how to switch to Malay. It's written so a new guard can learn it in one shift briefing.

---

## How TemanMu meets the judging criteria

### Impact & Sustainability Value

- **Residents** keep living independently in a familiar home, with no cameras or wearables, and meet people through Community Buddies and local activities.
- **Families** get a calm daily reassurance and hear early when something changes.
- **The township** gets coordinated responses, with every alert ending in a recorded outcome.
- **Measurable pilot targets:** 70% of residents report more confidence living independently, 80% of caregivers report more reassurance, false alert rate below 20%, median response under 15 minutes, and no missed critical events. These are proposed targets, not achieved results.

### Innovation & Differentiation

- **Personal, not one-size-fits-all.** Alerts compare against each resident's own usual quiet gap, not a fixed number of hours.
- **Three signals cross-check.** Water, electricity and access-card taps together tell an outing apart from a worrying silence, unlike single-meter alerts. A card tap also shows who went out, when, and through which reader.
- **Asks the resident first.** A check-in call and any sign of activity cancel the alert before anyone is bothered.
- **A clear human response.** Family and township guard are alerted together, and the case stays open until someone takes it and records the outcome.
- **Safety and companionship in one service,** not just an alarm.

### Feasibility & Deliverability

- **Working prototype** today: rules engine, timers, township dashboard and family app all run live. Only the sensors are simulated.
- **Reuses what is already there.** Existing TNB electricity smart meters and Air Selangor water meters, plus the township's own access-card system. No new device goes into the home. This depends on proposed data partnerships with TNB, Air Selangor and the SDP access-card system, which a pilot needs to confirm.
- **Uses existing staff.** Township security and management handle responses, so no new team is needed.
- **Phased plan:** a 10–20 home pilot in Q1 2027, expanding to 50–100 homes only if safety and reliability targets are met.

### Strategic Fit & Theme Relevance

- **People challenge:** more older Malaysians live alone (6.3% in 2018 to 18.8% in 2025), and 14.1% had a fall in the past year.
- **Township priority:** supports safe, caring, age-friendly communities where residents can grow old in place, and builds neighbourly ties through buddies and shared activities.
- **Built on township infrastructure:** utility meters, access control and on-site security that townships already have.

### Commercial & Value Multiplication

- **Who pays:** bundled into selected new launches, a family subscription (indicatively RM 39 – 59/month) for existing homes, or a value-added township service.
- **Running cost:** about RM 16 – 43 per home per month.
- **Value to Sime Darby Property:** appeal to buyers planning for ageing parents, residents staying longer, and a caring, age-friendly brand.
- **Value to local businesses and residents:** community activities and volunteer buddies bring residents into shared township spaces.
- **Scales** as a repeatable package (standard hardware, installation and responder training) across future developments from 2028.

---

## The prototype

Real meters are not installed yet, so a **3D simulated home** stands in for one. Clicking the tap or kettle sends the same data a real meter would, and in the outing scenarios she walks to the lift lobby and taps her card; everything after that (rules, timers, alerts, dashboard, family app) runs live.

| Page | Address | Who it represents |
| --- | --- | --- |
| Landing page | `/` | Overview and links |
| Live 3D view | `/simulator` | Madam Lee's home (A-105), with clickable sensors and one-click scenarios |
| Township dashboard | `/dashboard` | Guard Ali's view of Block A |
| Caregiver app | `/caregiver` | Her daughter Sarah's phone (installable PWA) |
| Pitch slides | `/slides` | Our presentation |

Try it at **https://temanmu-ae.vercel.app/**. All pages share one live state, so open them side by side. The 3D view has one-click scenarios: **Normal Morning**, **Going Out**, **Not Back Yet**, **Tapped In, Home Quiet**, **Unusual Inactivity** and **False Alarm Recovery** (timings shortened from hours to seconds).

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

The backend reads `DATABASE_URL` from `backend/.env` (created from `.env.example` below). Use the Supabase session pooler, port 5432.

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
| Routine models | scikit-learn gradient boosting, trained offline in `backend/ml` and exported to `shared/ml/*.json` |
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
