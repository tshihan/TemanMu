# TemanMu: Product Requirements Document (First-Round Prototype)

**Scope:** Hackathon prototype for Sime Darby Property Township of Tomorrow 2026
**Companion document:** [temanmu.md](temanmu.md) (full proposal)
**Readers:** frontend, backend and 3D builders, the UI design pass, and the pitch/slides team

This PRD defines **what** the prototype does. All visual design (colours, typography, icons, spacing, layout styling) is intentionally left to the UI design pass. Where this document says a status must "stand out" or "look calm", it describes intent, not styling.

---

## 1. Problem Statement

Malaysia's population is ageing (8.4% aged 65+ in Q2 2026), and a growing share of older adults live independently. When an elderly resident living alone collapses or becomes unwell at home, it can take hours or days before anyone notices.

Existing solutions each have a gap:

- **Cameras** are intrusive in private spaces.
- **Wearables** are forgotten, left uncharged, or removed in the bathroom, where falls are common.
- **Dedicated indoor sensors** add hardware and continuous movement tracking.
- **Single-signal utility monitoring** (water only, fixed threshold) produces false alarms, and often has no clear process for who responds.

Two further gaps make this worse:

- **Families live far away.** A caregiver in another city cannot check in person, so they either call anxiously every day or hear nothing until something goes wrong.
- **Living alone often means being isolated.** Older residents may share a block with hundreds of neighbours yet know none of them. Nobody nearby notices a missed morning routine, and safety tools usually only contact people when something is wrong.

**How might we** use everyday household utility data (water, electricity and the front door) to notice when an elderly resident's routine breaks, get a human to check on them quickly, give families daily reassurance and help residents connect with their neighbours, without watching the resident's every movement?

---

## 2. Prototype Scope

### In scope

One web application (one frontend build) with separate pages, opened in separate browser tabs or devices during the pitch:

| Page | URL | Purpose |
| --- | --- | --- |
| Landing page | `/#` | Explains the product and links to every view |
| **Township dashboard** | `/dashboard` | Township Operator view of the whole housing block |
| **Caregiver app** | `/caregiver` | Mobile app for the family caregiver. Installable on a phone as a PWA |
| **Live 3D view** | `/simulator` | Presenter stage: the **simulated 3D home** of unit A-105, scenarios and sensor controls |
| Slides | `/slides` | Pitch slides |

All pages share one live state: the real backend over REST and WebSocket, or a shared in-browser mock (section 10.3).

A Python backend ingests simulated sensor readings, runs the status rules and timers, and pushes updates live.

### Out of scope (pitch slides only)

- Real smart meter or door sensor hardware.
- Resident-facing app or resident mode.
- Real automated voice call (it is **simulated** in the prototype).
- Neighbours as emergency responders (neighbours appear only as opt-in **same-hour neighbour** introductions, section 5.4; alerts go to the caregiver and the township guard).
- Native app-store app (the Caregiver app is an installable PWA).
- Machine-learned baselines (baselines are pre-filled values in the prototype).
- Automatically contacting emergency services. A human-initiated 999 handoff is supported by the incident workflow.
- "Appliance left on" detection (future work, see section 7).

### Cut during the build

These were in the first PRD but were dropped after testing because they added little to the demo. Their backend APIs may remain, but the UI does not use them.

- Single-screen split layout, draggable divider, role switcher and inactive-role badge (replaced by separate pages).
- Township unit detail panel with per-sensor timelines and reason line, and the incident history list.
- Caregiver "thinking of you" preset messages delivered as a simulated voice call. The 3D phone call animation remains as a presenter test.

---

## 3. Roles

| Role | Who | Where in the UI |
| --- | --- | --- |
| **Township Operator** | Township management and guard (Guard Ali), merged into one role | Township dashboard |
| **Caregiver** | The resident's designated family member (Sarah) | Caregiver app (phone) |
| **Presenter** (demo only) | The team member running the pitch | Live 3D view controls |
| **Resident** (passive) | The elderly person, shown as the animated character | No UI. Confirms wellbeing passively through activity |

---

## 4. User Stories

### Caregiver

- As a caregiver, I want a short message each morning when Mum's routine starts, so I know she is fine without calling to check.
- As a caregiver, I want to be alerted when Mum's routine breaks and she cannot be reached, so I can act quickly.
- As a caregiver, I want to see Mum's day at a glance (when water, electricity and the door were used), so I can check on her without calling.
- As a caregiver, I want reminders until someone responds, so an alert is never silently missed.
- As a caregiver, I want to tell everyone I'm checking in with Mum, or ask the township to visit, so the right person goes and nobody assumes someone else is handling it.
- As a caregiver, I want to close an alert myself after I've spoken to Mum and she's fine, so the guard isn't sent for nothing.
- As a caregiver, I want to see who is checking on Mum and the outcome they recorded, so I know the situation is resolved.
- As a caregiver, I want to see community activities near Mum and invite her or join with her, so she stays socially connected without needing to use technology herself.
- As a caregiver, I want to request a Community Buddy for Mum and see who she's matched with, so she has a friendly volunteer who shares her interests.
- As a caregiver, I want to be introduced to a neighbour in Mum's block who keeps the same hours, with Mum's consent and without her routine being exposed, so she has a friend whose day naturally crosses hers.

### Township Operator

- As a township operator, I want to see every unit in the block, floor by floor, with the units that need attention standing out, so I can focus on them.
- As a township operator, I want to see how long a flagged unit has been quiet compared with this resident's usual gap, so I trust the alert.
- As a township operator, I want to be alerted at the same time as the caregiver when a resident cannot be reached, so help can arrive even if the family is far away.
- As a township operator, I want to acknowledge, then close an incident with an outcome and short report, so there is an accountable record.
- As a township operator, I want to call 999 and record that I did, or record that I couldn't verify the resident's safety, so a serious case is escalated and never closed by mistake.

### Resident (passive)

- As an elderly resident, I want the system to confirm I'm fine from my normal activity, so I'm never asked to use an app.
- As an elderly resident, I want my outings to be left alone, so my family isn't alarmed every time I leave home.
- As an elderly resident, I want my daily routine kept private, so neighbours only learn that we keep similar hours, never when I'm out.

### Presenter

- As a presenter, I want one-click scenarios, so the demo runs reliably under pressure.
- As a presenter, I want to trigger sensors manually by clicking objects in the home, so judges can see it is live and try it themselves.
- As a presenter, I want a "sensor view" that dims everything except the metered objects, so judges see exactly what TemanMu receives.
- As a presenter, I want to reset the demo in one click, so each judge sees a clean run.
- As a presenter, I want timings to be shortened through configuration, so a multi-hour real-world flow fits into a few minutes.

---

## 5. Features

Priority: **P0** is required for the demo, **P1** is strongly wanted, **P2** is optional polish.

### 5.1 Global Shell

| ID | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| G1 | Separate pages | Landing, Township dashboard, Caregiver app, Live 3D view and Slides as hash-routed pages of one app (section 2). Each view links to the others and opens in a new tab, so the presenter can place them side by side or on different devices. | P0 |
| G2 | Shared live state | Every open page and device sees the same state, from the backend WebSocket or the shared mock (section 10.3). A reading sent from the 3D view appears in the dashboard and caregiver app within a second. | P0 |
| G3 | Landing page | Explains the problem, the three signals, the human response and both audiences (families and townships), and links into the live prototype. | P1 |
| G4 | Installable caregiver app | The Caregiver app installs to a phone home screen as a PWA and works over the same Wi-Fi as the presenting laptop. | P1 |
| G5 | Light/dark theme toggle | The caregiver app has a light/dark setting, remembered per device. | P1 |
| G6 | Sound with mute | Caregiver app: distinct subtle sounds for morning reassurance, new alert and reminder, with a mute toggle. 3D home: ambient sounds for tap, kettle, footsteps, door and ringing phone, with its own mute. The demo must be fully understandable with sound muted. | P1 |
| G7 | Screen support | Dashboard and 3D view are designed for 1920×1080 and remain usable at 1366×768. The caregiver app is designed for phone screens and shows in a phone frame on a laptop. | P0 |
| G8 | Config-driven durations | The UI never hard-codes durations. All countdowns and duration labels use values from the backend (`GET /api/config` and per-unit baselines). | P0 |
| G9 | Language | English only. | P0 |

### 5.2 Simulated 3D Home (Live 3D view, built with React Three Fiber)

| ID | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| S1 | Sims-like home | A furnished cutaway 3D home for unit A-105 (bedroom, bathroom, kitchen, dining and living room), with orbit, zoom and camera reset. Water points (bathroom tap, shower), electricity points (kettle, TV, bedroom lamp) and the main door. | P0 |
| S2 | Animated resident | Madam Lee, a rigged and animated elderly character, walks between rooms along a waypoint graph and performs each action. | P0 |
| S3 | Clickable sensor objects | Clicking a sensor object walks the character to it and, once the action completes, sends the reading to the backend. Water objects add up to one household water reading; electricity objects add up to one household electricity reading. | P0 |
| S4 | Meter readout panel | Shows current A-105 water flow, electricity power and door state. Pulses when a reading is confirmed, and marks values as "last confirmed" while disconnected. | P0 |
| S5 | Sensor view and audience labels | A **Demo view / Sensor view** toggle. Sensor view dims the home so only the metered objects stand out. Scenario labels state that the fall is for the audience only and is not a sensor reading. | P0 |
| S6 | Scenario player | Four scenarios (see section 6.1) chosen from tabs, with play, pause, stop and a step timeline showing the current action. | P0 |
| S7 | Reset demo | Button with a confirmation step. Calls `POST /api/demo/reset` and returns the character and scene to the starting state. | P0 |
| S8 | Incoming phone call | The living-room phone rings, the character answers and a speech bubble shows the text. Triggered by the `companion.message_delivered` event or by "Test incoming call" in the presenter tools. | P2 |
| S9 | Township responder | In the Unusual Inactivity scenario, Guard Ali (a separate animated character) arrives from outside after the township acknowledges, opens the door, walks to Madam Lee and crouches to check her. | P1 |
| S10 | Presenter tools | Collapsed panel to move the character to named rooms, toggle each sensor object, test an incoming call and set how long the Going Out scenario stays outside. Disabled while a scenario plays. | P1 |
| S11 | Monitoring switch | The 3D view turns A-105's quiet-gap watch on while a scenario plays and off when it stops (`POST /api/demo/monitoring`), so the unit does not raise alerts while the presenter is talking. | P0 |

The character is for the audience only. **The character never sends data.** Only sensor-object events (tap, shower, kettle, TV, lamp, door) produce readings. Answering the phone and Guard Ali's staged door movement are **not** sensor events and do not count as activity for the status rules.

The 3D home both **sends** readings (REST) and **receives** events (it subscribes to the same WebSocket as the dashboard).

### 5.3 Township View

| ID | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| T1 | Block view | Housing Block A: 24 floors × 6 units (144 units). Floor 1 holds the six live units, including the controllable unit A-105. Floors 2–24 are illustrative sample data with two sample alerts (A-1204 Mr Lim, A-2106 Mdm Wong), so the view feels like a real block. | P0 |
| T2 | Floor map and lens | A compact map of all 24 floors, marking floors with alerts, beside a three-floor "lens" showing unit tiles. Navigate by clicking a floor, ▲/▼ buttons or arrow keys. A "go to unit" search jumps to a unit number. | P0 |
| T3 | Status distinction | Only units that need a response stand out: **Unusual Inactivity** and **Unresolved Concern** each have their own colour, glyph and pulse. Routine and Possible Away both read as "No action needed", so outings stay silent. Not reliant on colour alone. | P0 |
| T4 | Quiet-gap progress bar | Each unit tile shows how long water has been silent against this resident's usual maximum quiet gap. An inactive unit shows the elapsed time. | P0 |
| T5 | Baseline note | Indicates the baseline is "learned from history (simulated)". | P1 |
| T6 | Needs attention list | A side list of every alerting unit, worst first, with the resident's short name and who is checking. Filter chips (Concern / Inactive) dim everything else. | P0 |
| T7 | Incident response dialog | When a live incident is notified, an "Incident response" dialog opens automatically. It shows the incident and offers **I'll Check Now**. After acknowledging: choose an outcome, add an optional note, and submit. Also offers **Call 999** (`tel:999`), "I called 999, record it" and "I can't verify safety". It can be minimised to a side button and shows a confirmation when the incident ends. | P0 |

**Reason lines.** The backend still generates a plain-language `status_reason` that names every signal that decided the status (examples below). The dashboard does not show it since the unit detail panel was cut; the caregiver app's status card shows its own short version of the same reason.

**Reason line examples** (wording is illustrative; the backend generates `status_reason`):

| Situation | Example reason line |
| --- | --- |
| Routine, day started | "Water and electricity activity within usual routine" |
| Possible Away | "Door opened at 08:02, then no water use and electricity back to standby: probably out" |
| Returned from Possible Away | "Door opened at 11:40 and electricity use detected: back home" |
| Unusual Inactivity | "No water use for 0:34, longer than usual maximum of 0:30. No door event" |
| Auto-resolved by electricity | "Resolved: electricity use detected (kettle on) during grace period" |
| Auto-resolved by water | "Resolved: water use detected during grace period" |

### 5.4 Caregiver App (mobile PWA)

A phone app with four tabs: **Home**, **Updates**, **Together** and **Settings**.

| ID | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| C1 | Status card (Home) | One card showing the resident's state in plain language: routine looks normal, routine not confirmed yet, possibly away, caregiver-confirmed home, checking quietly (with the simulated-call countdown), unusual inactivity (with response actions), someone is checking, emergency handoff, or alert closed. Shows resident name, unit and last-updated time. While Possibly Away, the caregiver may call and, only after speaking directly with the resident, record that they are home and okay. | P0 |
| C2 | Call button | "Call Mum" button (simulated call screen, no real call). | P1 |
| C3 | Mum's day (Home) | A 24-hour timeline with one lane each for water, electricity and front door, marking today's activity and the current state of each. Labelled "Water, power & door only". | P1 |
| C4 | Updates feed | Morning reassurance, alerts, reminders and incident updates, grouped by day, with unread markers and "Mark all read". A new update shows an in-app push banner. Tapping an update opens the matching screen. | P0 |
| C5 | Caregiver response | From an alert: "I'll check in with Mum" (records a remote check-in), "Ask township to visit", and after checking in, "I spoke to Mum, no help needed" (closes the incident). Remote actions never claim the in-person visit, so the township can still go. If the caregiver is the acknowledger, they can record an outcome. A banner on other tabs keeps an open alert one tap away. | P0 |
| C6 | Community activity (Together) | Shows the next community activity near the resident, with "Invite Mum" and "I'll join too" actions. Saved only; TemanMu contacts nobody. | P1 |
| C7 | Community Buddy (Together) | Caregiver taps "Find a buddy". The backend matches a pre-seeded volunteer by shared interest. The card shows the buddy's name, shared interest and next activity together, tagged simulated. | P1 |
| C8 | Same-hour neighbour (Together) | Caregiver records Mum's consent ("Open to meeting neighbours"). The backend suggests another consenting resident in the block whose outings overlap hers. The card shows only their name, floor and coarse labels (for example "Both early risers who head out in the mornings"), plus a suggested first meeting activity. "Ask for an introduction" records a request for the community coordinator to introduce them in person. "Stop sharing Mum's routine" withdraws consent. | P1 |
| C9 | Settings | Resident profile, responders (caregiver and Guard Ali), the three sensors, and the light/dark theme. | P2 |

**Companion intent:** C6–C8 show that TemanMu supports companionship on normal days, not only during alerts. The resident stays tech-free: the caregiver acts on her behalf, and anything that reaches her arrives as a person.

**Neighbour privacy:** the API never exposes wake times, outing windows or the other resident's unit number. Knowing "she leaves every day at 7" would help a burglar. Both residents must consent, and a human makes the introduction.

### 5.5 Backend

| ID | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| B1 | Reading ingestion | Accepts sensor readings over REST, as a real meter gateway would. | P0 |
| B2 | Rules engine | Applies the status rules (section 7) per unit. Implemented as a separate pure module so it can be reused with real data later. | P0 |
| B3 | Timers | Grace period and reminder timers run on the backend and survive a browser refresh. Single worker process. | P0 |
| B4 | Live push | Pushes all state changes to connected dashboards over WebSocket. | P0 |
| B5 | Simulated voice call | Writes voice-call events into the incident timeline during the grace period (rings for `VOICE_CALL_RING_SECONDS`, then "no answer"). The companion message API still exists but has no UI. | P0 |
| B10 | Buddy matching | Matches a resident with a pre-seeded volunteer buddy by shared interest. Simple lookup, no algorithm required in the prototype. | P1 |
| B11 | Same-hour neighbour matching | Matches consenting residents by overlap of their (seeded) outing windows, at least `NEIGHBOUR_MIN_OVERLAP_MINUTES`. Returns coarse labels only. Records consent and introduction requests. | P1 |
| B12 | Emergency escalation | Records "unable to verify" and "999 call reported" on an acknowledged incident and notifies both roles. Never places a call. | P0 |
| B13 | Monitoring switch | Turns the controllable unit's quiet-gap watch on or off (off after reset and restart). Grace and reminder timers of an active incident keep running. | P0 |
| B6 | Background units | Seeds five background units with fixed scripted states on reset. | P0 |
| B7 | Demo reset | Clears readings, incidents and notifications, and restores seed data. | P0 |
| B8 | Configuration | Global timings from `.env`. Per-resident baselines from the database. | P0 |
| B9 | Persistence | Supabase (Postgres), accessed only by the backend. The frontend never connects to Supabase directly. | P0 |

---

## 6. User Flows

### 6.1 Demo Scenarios

**Scenario 1: Normal Morning** (shows daily reassurance)

1. The character wakes and walks to the bathroom. The simulator sends a water reading.
2. The character boils the kettle. The simulator sends an electricity reading.
3. The backend registers the day's first activity and keeps the unit in Routine.
4. The backend creates a morning reassurance notification for the caregiver.
5. The caregiver app (on a phone or in its own tab) shows a push banner and chime: "Mum's day has started". Mum's day timeline marks the water and electricity use.

**Scenario 2: Going Out** (shows the silent away status; can be cut if time is short)

1. The character walks to the door and leaves. The simulator sends a door reading.
2. With no further water or electricity activity, the backend sets Possible Away.
3. No notification is sent to anyone.
4. The character returns and the simulator sends a door reading. The unit returns to Routine.

**Scenario 3: Unusual Inactivity** (shows the full safety flow)

1. The character collapses in the living room (labelled as audience-only). The simulator sends no further readings.
2. The quiet-gap progress bar on A-105's tile fills. When water silence exceeds the resident's usual maximum, the backend sets Unusual Inactivity and starts the grace period.
3. The phone in the 3D home rings for the simulated voice call, then stops with no answer. The caregiver app shows "Checking on Mum quietly" with the grace countdown; nobody is alerted yet.
4. The grace period ends with no activity. The backend notifies the caregiver and the township at the same time. The township's Incident response dialog opens, and the caregiver app shows the alert with its response actions.
5. The backend sets Unresolved Concern. If nobody acknowledges, it sends reminders at the configured interval.
6. In the presenter-only mock, Guard Ali acknowledges the township alert and a 3D responder reenacts arriving from outside, entering, and checking Mum. The staged door movement sends no resident sensor reading. The incident remains acknowledged until a human records the outcome in the dashboard (see 6.2). In live mode the scene waits for a real township acknowledgement; it never dispatches a person automatically.

**Scenario 4: False Alarm Recovery** (shows how false alarms are avoided)

1. Starts like Scenario 3 and reaches Unusual Inactivity. The simulated voice call starts.
2. During the grace countdown, the character gets up and uses the tap. The simulator sends a water reading.
3. The backend cancels the voice call, resolves the incident as "Resident activity detected" and returns the unit to Routine.
4. Nobody is notified.

### 6.2 Acknowledge and Close an Incident

1. Caregiver and township receive the alert together. The caregiver can record a remote check-in or request a township visit; both actions stay visible to both roles and keep the incident open.
2. The township operator taps "I'll Check Now" in the Incident response dialog to take the in-person visit. This stops reminders and records the visit owner. Only the township can acknowledge.
3. The visit owner records a confirmed outcome: **Resident OK**, **Assistance provided**, **Sent to hospital**, or **Resident was away**, with an optional note (the township record always carries a short report; the outcome label is used if no note is added).
4. Before the township takes the visit, a caregiver who has started a check-in may close the incident only after explicitly reporting direct contact with the resident and no need for help.
5. The backend closes the incident, writes it to history and returns the unit to Routine.

**Emergency handoff:** After acknowledging, the responder can record that resident safety could not be verified, or that they personally called 999. The latter records a reported call, not confirmed dispatch. Both actions stay on the open incident timeline and notify caregiver and township; neither action places a call. The interface offers a `tel:999` link and prompts the caller to provide the full site address, unit and access details. The case remains open until the responder records the later outcome. Sensor activity cannot automatically close it. If safety could not be verified, the case cannot be closed as "assistance provided" or "resident away" without a recorded emergency handoff; a later in-person confirmation that the resident is OK can close it.

**Auto-resolve:** at any point before closing, any water, electricity (above baseline) or door reading for the unit resolves the incident as "Resident activity detected".

### 6.3 Manual Sensor Trigger

1. The presenter or a judge clicks the tap, shower, kettle, TV, lamp or door in the 3D home (or uses the presenter tools).
2. The character walks to the object and performs the action.
3. The simulator sends the reading. The meter panel updates.
4. The dashboard and caregiver app react according to the rules.

### 6.4 Companion Flows

**Request a Community Buddy**

1. In the caregiver app's Together tab, the caregiver taps "Find a buddy".
2. The backend matches a pre-seeded volunteer who shares one of the resident's interests.
3. The card shows the matched buddy, the shared interest and the next activity they could attend together. A "Buddy matched" update appears in the feed.

**Meet a same-hour neighbour**

1. In the Together tab, the caregiver taps "Open to meeting neighbours", recording Mum's consent.
2. The backend finds the consenting resident whose outing windows overlap Mum's the most (at least `NEIGHBOUR_MIN_OVERLAP_MINUTES`).
3. The card shows "Meet Madam Wong Siew Lan", her floor, why they match ("Both early risers who head out in the mornings") and a good first meeting (Morning Tai Chi), tagged simulated. No times or unit numbers are shown.
4. The caregiver taps "Ask for an introduction". The card shows when it was requested, and an "Introduction requested" update appears in the feed. Nobody is actually contacted.
5. "Stop sharing Mum's routine" withdraws consent and hides the match. Demo reset returns to step 1.

### 6.5 Demo Reset

1. The presenter clicks "Reset demo" and confirms.
2. The backend clears readings, incidents and notifications, and restores seed data.
3. The backend broadcasts a fresh snapshot. The 3D home returns the character to the starting position.

---

## 7. Status Rules (Prototype)

All thresholds come from configuration or the resident's baseline profile, never from constants in code.

**Definitions**

- **Activity:** a water reading with flow above zero, an electricity reading above the resident's `standby_power_kw`, or a door event.
- **Day start:** the moment of demo reset. In production this is the resident's usual wake window.
- **Monitoring window (prototype only):** the controllable unit's quiet-gap and outing checks run only while the 3D view is playing a scenario (B13, S11), so A-105 does not raise alerts while the presenter is talking. Readings are always processed. In production every unit is watched continuously.

| Status | Enters when | Leaves when | Action |
| --- | --- | --- | --- |
| **Routine** | Default state. Also entered on any activity while in Possible Away, after direct caregiver confirmation that the resident is home and okay, or when an incident is resolved or closed. | Rules below fire. | On the day's first sensor activity, create a morning reassurance notification for the caregiver. Caregiver confirmation is labelled as reported, never as sensor activity. |
| **Possible Away** | A door event is followed by no water or electricity activity. | Another door event or any activity returns to Routine. A caregiver who spoke directly with the resident may confirm they are home and okay, returning to Routine and restarting the quiet-gap watch from that time. If nobody confirms and time since the door event exceeds `usual_outing_seconds`, move to Unusual Inactivity. | Silent; caregiver chooses whether to call before the usual outing time is exceeded. |
| **Unusual Inactivity** | Not in Possible Away, and time since the last water activity exceeds `usual_quiet_gap_seconds`. Or Possible Away timed out. | Any activity resolves it ("Resident activity detected"). The grace period ending with no activity notifies both roles and moves to Unresolved Concern. | Create an incident. Start the grace timer (`GRACE_PERIOD_SECONDS`). Log the simulated voice call. |
| **Unresolved Concern** | The grace period ended without activity. | Acknowledged and closed by either role, or any activity resolves it. | Notify caregiver and township. Repeat reminders every `REMINDER_INTERVAL_SECONDS` until acknowledged. |

Water silence alone can trigger Unusual Inactivity. Electricity activity counts as confirmation (resolves the incident) but does not reset the water quiet-gap timer before an incident starts.

After a caregiver confirms the resident is home and okay, the watch uses the later of the last water reading and the caregiver confirmation. The actual last water timestamp remains unchanged. A later concern says that no new water use was recorded since the call. If the caregiver does not call, the existing outing timeout remains active.

**Role of each signal** (state this clearly in the pitch):

| Signal | Role |
| --- | --- |
| **Water** | Primary trigger. Silence beyond the resident's usual quiet gap starts Unusual Inactivity. |
| **Electricity** | Separates an outing from inactivity after a door event (standby means probably out, use means home). Cancels an incident during the grace period. |
| **Door** | Marks a possible outing, so absence is not mistaken for inactivity. |

**Future work (not in prototype):** an "appliance left on" rule, where a stove, iron or heater left on far longer than usual with no water activity also triggers Unusual Inactivity (for example, a fall while cooking).

**Future initiative (not in this demo):** with township integration and resident consent, access-card events at controlled gates could provide stronger evidence of a perimeter outing. Facility taps and absence of a tap do not establish that the resident is inside their home.

---

## 8. API Contract

**Base URL:** `http://localhost:8000` (backend runs on the presenting laptop)
**Format:** JSON, UTC ISO-8601 timestamps
**Auth:** none in the prototype. The role is passed explicitly where needed.

### 8.1 Shared Types

```ts
type UnitId = string;                  // e.g. "A-105"
type Role = "township" | "caregiver";
type Sensor = "water" | "electricity" | "door";
type Status = "routine" | "possible_away" | "unusual_inactivity" | "unresolved_concern";
type IncidentState = "grace" | "notified" | "acknowledged" | "closed" | "auto_resolved";
type Outcome = "resident_ok" | "assistance_provided" | "sent_to_hospital" | "resident_away" | "resident_activity_detected";

interface Reading {
  unit_id: UnitId;
  sensor: Sensor;
  value: number | "open" | "closed";   // water: L/min, electricity: kW, door: "open" | "closed"
  recorded_at: string;
}

interface Baseline {
  usual_quiet_gap_seconds: number;     // demo-scaled
  usual_outing_seconds: number;        // demo-scaled
  standby_power_kw: number;
  source: "simulated_history";
}

interface Unit {
  unit_id: UnitId;
  resident_name: string;
  caregiver_name: string;
  caregiver_relationship: string;      // how the caregiver refers to the resident, e.g. "Mum"
  controllable: boolean;               // true only for the 3D home unit
  status: Status;
  status_reason: string;               // plain-language reason line
  status_since: string;
  latest: {
    water_lpm: number;
    power_kw: number;
    door: "open" | "closed";
    last_door_event_at: string | null;
  };
  quiet_gap: {
    last_water_activity_at: string | null;
    last_caregiver_confirmation_at: string | null;
    usual_max_seconds: number;         // client computes elapsed from the later of these timestamps
  };
  baseline: Baseline;
  active_incident_id: string | null;
}

interface IncidentEvent {
  type:
    | "detected" | "voice_call_started" | "voice_call_no_answer" | "voice_call_cancelled"
    | "notified" | "reminder" | "acknowledged" | "caregiver_checking_in" | "township_requested"
    | "unable_to_verify" | "emergency_called" | "closed" | "auto_resolved";
  at: string;
  actor?: { role: Role; name: string };
  detail?: string;                     // e.g. "Reminder #3", "simulated"
}

interface Incident {
  incident_id: string;
  unit_id: UnitId;
  state: IncidentState;
  opened_at: string;
  grace_ends_at: string | null;        // client renders the countdown from this
  next_reminder_at: string | null;     // client renders the countdown from this
  reminder_count: number;
  acknowledged_by: { role: Role; name: string; at: string } | null;
  outcome: Outcome | null;
  report?: string | null;
  closed_at: string | null;
  events: IncidentEvent[];
}

interface Notification {
  notification_id: string;
  role: Role;
  unit_id: UnitId;
  kind:
    | "morning_reassurance" | "alert" | "reminder" | "acknowledged" | "caregiver_checking_in"
    | "township_requested" | "unable_to_verify" | "emergency_called" | "closed" | "auto_resolved"
    | "message_delivered" | "buddy_matched" | "neighbour_introduced";
  message: string;
  incident_id: string | null;
  created_at: string;
  read: boolean;
}

interface CommunityActivity {
  activity_id: string;
  title: string;
  starts_at: string;
  location: string;
  near_unit_id: UnitId;
}

interface MessagePreset {
  preset_id: string;
  text: string;                        // e.g. "Thinking of you, Mum"
}

interface CompanionMessage {
  message_id: string;
  unit_id: UnitId;
  from_name: string;                   // caregiver name
  preset_id: string;
  text: string;                        // copied from the preset
  channel: "voice_call";
  simulated: true;
  status: "delivered";
  sent_at: string;
}

interface Buddy {
  buddy_id: string;
  name: string;
  interests: string[];
}

interface BuddyMatch {
  unit_id: UnitId;
  buddy: Buddy;
  shared_interest: string;
  next_activity: CommunityActivity | null;
  simulated: true;
  matched_at: string;
}

interface NeighbourMatch {             // deliberately carries no times and no unit_id (privacy)
  name: string;
  floor: number;
  labels: string[];                    // coarse, e.g. ["early riser", "morning"]
  meeting_activity: CommunityActivity | null;
  simulated: true;
}

interface NeighbourState {
  unit_id: UnitId;
  opted_in: boolean;
  match: NeighbourMatch | null;        // always null while opted_in is false
  introduction_requested_at: string | null;
}
```

The backend sends **deadlines** (`grace_ends_at`, `next_reminder_at`, `last_water_activity_at`), never ticking counters. The frontend computes countdowns and progress locally, which keeps it in sync with `.env` values automatically.

### 8.2 Simulator → Backend (sensor ingestion)

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/api/readings` | `Reading` (`recorded_at` optional, defaults to server time) | `201` `{ "accepted": true, "unit": Unit }` |

- Only the controllable unit receives readings from the simulator.
- The simulator sends a reading **when a value changes** (tap on or off, kettle on or off, door open or closed).
- Scenarios are scripted **in the simulator** and use this same endpoint. The backend does not know which scenario is running, just as it would not with real meters.

### 8.3 Dashboard Reads

| Method | Path | Response |
| --- | --- | --- |
| GET | `/api/config` | `{ "grace_period_seconds": number, "reminder_interval_seconds": number }` |
| GET | `/api/units` | `Unit[]` |
| GET | `/api/units/{unit_id}` | `Unit` |
| GET | `/api/units/{unit_id}/readings?since={iso}` | `Reading[]` (for timelines) |
| GET | `/api/units/{unit_id}/incidents?state=closed` | `Incident[]` (history) |
| GET | `/api/incidents/{incident_id}` | `Incident` |
| GET | `/api/notifications?role={role}` | `Notification[]` (newest first) |
| GET | `/api/community/activities?unit_id={unit_id}` | `CommunityActivity[]` |
| GET | `/api/companion/messages?unit_id={unit_id}` | `CompanionMessage[]` (newest first) |
| GET | `/api/companion/message-presets` | `MessagePreset[]` |
| GET | `/api/companion/buddy?unit_id={unit_id}` | `BuddyMatch` or `null` |
| GET | `/api/companion/neighbours?unit_id={unit_id}` | `NeighbourState` |

### 8.4 Dashboard Actions

| Method | Path | Body | Response | Errors |
| --- | --- | --- | --- | --- |
| POST | `/api/incidents/{id}/acknowledge` | `{ "role": "township", "name": string }` | `200` `Incident` | `409` if already acknowledged, closed, or called by another role |
| POST | `/api/incidents/{id}/caregiver-response` | `{ "role": "caregiver", "name": string, "action": "caregiver_checking_in" \| "township_requested" \| "resident_confirmed_safe" }` | `200` `Incident` | `409` if closed, duplicate action, or direct safety confirmation without a prior check-in |
| POST | `/api/units/{unit_id}/confirm-home` | `{ "role": "caregiver", "name": string }` | `200` `Unit` | `404` if unit absent; `409` unless currently Possible Away with no active incident |
| POST | `/api/incidents/{id}/close` | `{ "role": Role, "name": string, "outcome": "resident_ok" \| "assistance_provided" \| "sent_to_hospital" \| "resident_away", "report"?: string }` | `200` `Incident` | `409` if not acknowledged or already closed. `403` if caller is not the acknowledger |
| POST | `/api/incidents/{id}/escalate` | `{ "role": Role, "name": string, "action": "unable_to_verify" \| "emergency_called" }` | `200` `Incident` | `409` if not acknowledged, closed or duplicate. `403` if caller is not the acknowledger |
| POST | `/api/notifications/read` | `{ "role": Role }` | `204` | |
| POST | `/api/notifications/{id}/read` | `{ "role": Role }` | `200` `Notification` | `404` if not found |
| POST | `/api/community/activities/{id}/respond` | `{ "action": "invite_resident" \| "join_together" }` | `200` `{ "ok": true }` | |
| POST | `/api/companion/messages` | `{ "unit_id": UnitId, "from_name": string, "preset_id": string }` | `201` `CompanionMessage` | `404` if preset does not exist |
| POST | `/api/companion/buddy/request` | `{ "unit_id": UnitId }` | `201` `BuddyMatch` | `409` if already matched. `404` if no buddy shares an interest |
| POST | `/api/companion/neighbours/consent` | `{ "unit_id": UnitId, "open": boolean }` | `200` `NeighbourState` | `404` if unit not found |
| POST | `/api/companion/neighbours/introduce` | `{ "unit_id": UnitId }` | `201` `NeighbourState` | `409` if not opted in or already requested. `404` if unit not found or no neighbour keeps the same hours |

`POST /api/companion/messages` and the message-preset endpoints remain in the backend but are no longer used by the UI (section 2, "Cut during the build").

### 8.5 Demo Control

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/api/demo/reset` | none | `200` `{ "units": Unit[] }`. Also broadcasts `snapshot` to all sockets. |
| POST | `/api/demo/monitoring` | `{ "active": boolean }` | `200` `{ "unit_id": UnitId, "active": boolean }`. Turns the controllable unit's quiet-gap watch on (with a fresh clock) or off. `404` before the first reset. |

### 8.6 WebSocket (Backend → Dashboard)

**Endpoint:** `ws://localhost:8000/ws`

Both role views run in the same page, so one connection receives events for both roles. Each event carries `role` where relevant, and the frontend routes it to the right view and badge.

**Envelope**

```json
{ "type": "<event type>", "at": "<iso timestamp>", "data": { } }
```

| Type | When | `data` |
| --- | --- | --- |
| `snapshot` | On connect and after demo reset | `{ "units": Unit[], "incidents": Incident[], "notifications": Notification[], "config": {...} }` |
| `reading.received` | Every accepted reading | `Reading` |
| `unit.updated` | Status, reason, latest values or quiet-gap data change | `Unit` |
| `incident.updated` | Incident created, or any state or timeline change (voice call, notified, reminder, acknowledged, closed, auto-resolved) | `Incident` |
| `notification.created` | A notification is created for either role | `Notification` |
| `companion.message_delivered` | A companion message is sent (API only; no UI sends one now). The 3D home uses this to play the phone call | `CompanionMessage` |

The client should reconnect automatically and treat the next `snapshot` as the source of truth.

### 8.7 Configuration (`.env`)

See section 10.2 for the full `.env.example` of each app. Timing values:

```
GRACE_PERIOD_SECONDS=15            # production: 900
REMINDER_INTERVAL_SECONDS=15       # production: 900
VOICE_CALL_RING_SECONDS=2          # simulated call rings this long before "no answer"
NEIGHBOUR_MIN_OVERLAP_MINUTES=30   # same-hour neighbours: minimum outing overlap
NEIGHBOUR_EARLY_RISER_BEFORE=06:30 # wakes before this local time = "early riser" label
```

Per-resident values (`usual_quiet_gap_seconds`, `usual_outing_seconds`, `standby_power_kw`) live in the `resident_profiles` table and are demo-scaled in the seed data. Each resident's daily rhythm (wake time and outing windows) lives in `resident_rhythms`.

### 8.8 Data Model (Supabase / Postgres)

| Table | Key columns |
| --- | --- |
| `units` | `unit_id` PK, `resident_name`, `caregiver_name`, `caregiver_relationship`, `controllable`, `status`, `status_reason`, `status_since`, `last_water_activity_at`, `last_door_event_at`, `latest_water_lpm`, `latest_power_kw`, `latest_door` |
| `resident_profiles` | `unit_id` PK/FK, `usual_quiet_gap_seconds`, `usual_outing_seconds`, `standby_power_kw` |
| `readings` | `id` PK, `unit_id` FK, `sensor`, `value_num`, `value_text`, `recorded_at` |
| `incidents` | `incident_id` PK, `unit_id` FK, `state`, `opened_at`, `grace_ends_at`, `next_reminder_at`, `reminder_count`, `ack_role`, `ack_name`, `ack_at`, `outcome`, `report`, `closed_at` |
| `incident_events` | `id` PK, `incident_id` FK, `type`, `at`, `actor_role`, `actor_name`, `detail` |
| `notifications` | `notification_id` PK, `role`, `unit_id` FK, `kind`, `message`, `incident_id` FK nullable, `created_at`, `read` |
| `community_activities` | `activity_id` PK, `title`, `starts_at`, `location`, `near_unit_id` FK |
| `community_responses` | `id` PK, `activity_id` FK, `action`, `created_at` |
| `resident_interests` | `unit_id` FK, `interest`, `position` |
| `buddies` | `buddy_id` PK, `name`, `interests` (text[]) |
| `buddy_matches` | `unit_id` PK/FK, `buddy_id` FK, `shared_interest`, `matched_at` |
| `message_presets` | `preset_id` PK, `text` |
| `companion_messages` | `message_id` PK, `unit_id` FK, `from_name`, `preset_id` FK, `text`, `channel`, `status`, `sent_at` |
| `resident_rhythms` | `unit_id` PK/FK, `wake_local`, `outings` (jsonb list of local `start`/`end`) |
| `neighbour_consents` | `unit_id` PK/FK, `consented_at` |
| `neighbour_introductions` | `unit_id` PK/FK, `neighbour_unit_id` FK, `requested_at` |

- `units.latest_water_lpm`, `latest_power_kw` and `latest_door` hold each unit's current values for `Unit.latest`. Background units never receive readings, so these cannot be derived from `readings`. Reset fills them from `seed.json`, and reading ingestion updates them for the controllable unit.
- `resident_interests.position` keeps the interest order from `seed.json`. Buddy matching (section 9.6) depends on this order.

### 8.9 Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | React + Vite + Tailwind, `lucide-react` icons |
| Caregiver app | Same frontend, installable PWA via `vite-plugin-pwa` |
| 3D home | Three.js with React Three Fiber and Drei, Microsoft Rocketbox avatars (MIT) for Madam Lee and Guard Ali |
| Backend | Python, FastAPI, run with `uvicorn` as a **single worker** |
| Realtime | FastAPI native WebSocket |
| Timers | `asyncio` tasks |
| Config | `pydantic-settings` reading `.env` |
| Database | Supabase (Postgres) |

---

## 9. Seed Data

All teams use the **same** fixtures. The single source is `shared/seed.json` (section 10.1). The backend loads it on `POST /api/demo/reset`, and the frontend mock layer (section 10.3) serves it directly. Names and values below can be changed, but only in `seed.json`.

### 9.1 Units and Residents

| Unit | Resident | Caregiver (relationship) | Controllable | Status at reset | Interests |
| --- | --- | --- | --- | --- | --- |
| A-101 | Mr Tan Ah Kow | Jason Tan (Dad) | No | Routine | Chess |
| A-102 | Puan Aminah binti Yusof | Farah (Mak) | No | Possible Away | Cooking |
| A-103 | Mr Rajan Pillai | Priya (Appa) | No | Routine | Tai chi |
| A-104 | Madam Wong Siew Lan | Kelvin Wong (Mum) | No | Routine | Karaoke |
| **A-105** | **Madam Lee Mei Ling** | **Sarah Lee (Mum)** | **Yes (3D home)** | **Routine** | **Gardening, cooking** |
| A-106 | Encik Ismail bin Hassan | Hakim (Ayah) | No | Routine | Gardening |

- These six units are Floor 1 of Block A. Floors 2–24 on the Township dashboard are frontend-only sample data (section 5.3, T1), not in `seed.json`.
- Background units (all except A-105) keep their reset status for the whole demo and receive no readings.
- At reset, A-105 has no readings, `last_water_activity_at` is set to the reset time, and the character starts beside the bed.

### 9.2 Baselines (demo-scaled)

| Unit | `usual_quiet_gap_seconds` | `usual_outing_seconds` | `standby_power_kw` |
| --- | --- | --- | --- |
| A-101 | 40 | 60 | 0.12 |
| A-102 | 35 | 60 | 0.10 |
| A-103 | 45 | 50 | 0.15 |
| A-104 | 30 | 40 | 0.12 |
| **A-105** | **30** | **45** | **0.15** |
| A-106 | 50 | 60 | 0.10 |

Production equivalents are in hours (for example a 30-second demo quiet gap stands for roughly a few hours), and are learned from history rather than typed in.

### 9.3 Global Timings (`.env`)

| Key | Demo value | Production value |
| --- | --- | --- |
| `GRACE_PERIOD_SECONDS` | 15 | 900 |
| `REMINDER_INTERVAL_SECONDS` | 15 | 900 |

### 9.4 Simulated Sensor Values (A-105)

Each object adds its load to one household reading; switching an object off removes only its own load.

| Object | Load when on | Household reading when everything is off |
| --- | --- | --- |
| Bathroom tap | water +`6` L/min | water `0` |
| Shower | water +`9` L/min | water `0` |
| Kettle | electricity +`1.65` kW | electricity `0.15` kW (standby) |
| TV | electricity +`0.12` kW | electricity `0.15` kW (standby) |
| Bedroom lamp | electricity +`0.06` kW | electricity `0.15` kW (standby) |
| Door | door `"open"` | door `"closed"` |

### 9.5 Responder Names

| Role | Name used when acknowledging |
| --- | --- |
| Caregiver (A-105) | Sarah Lee |
| Township | Guard Ali |

### 9.6 Companion Data

**Resident rhythms and neighbour consent** (stand in for four weeks of history; in production derived from first water use and door open/close pairs)

| Unit | Wake | Outing | Open to neighbours | Role in the demo |
| --- | --- | --- | --- | --- |
| A-101 | 07:30 | 09:30–11:00 | Yes | No overlap with A-105 |
| A-102 | 06:30 | 07:30–09:00 | Yes | Second-best match |
| A-103 | 06:15 | 07:15–08:30 | No | Would match, excluded by consent |
| A-104 | 05:45 | 06:50–08:00 | Yes | **Best match for A-105** (Madam Wong) |
| **A-105** | **06:00** | **07:00–08:15** | **No** | Caregiver opts in live |
| A-106 | 05:30 | 16:30–18:00 | Yes | Evening walker, no overlap |

**Message presets** (API only, no longer in the UI)

| `preset_id` | Text |
| --- | --- |
| `p1` | Thinking of you, Mum |
| `p2` | Have a good day, Mum |
| `p3` | I'll visit you this weekend |
| `p4` | Remember to drink some water, Mum |

**Community buddies**

| `buddy_id` | Name | Interests |
| --- | --- | --- |
| `b1` | Auntie Mei | Gardening, tai chi |
| `b2` | Encik Rahman | Chess, cooking |
| `b3` | Kak Ros | Cooking, karaoke |

Buddy matching picks the first buddy sharing an interest with the resident, in `buddy_id` order. For A-105 this is Auntie Mei (gardening).

**Community activities**

| `activity_id` | Title | When | Location | Near unit |
| --- | --- | --- | --- | --- |
| `c1` | Community Gardening Session | Saturday 9:00 AM | Community Garden | A-105 |
| `c2` | Morning Tai Chi | Daily 7:30 AM | Central Park | A-103 |
| `c3` | Healthy Cooking Class | Wednesday 3:00 PM | Community Hall | A-102 |

`seed.json` stores each activity as a `schedule` rule, not a fixed date, so it never goes out of date:

```json
{ "activity_id": "c1", "schedule": { "repeat": "weekly", "weekday": "saturday", "time": "09:00" }, ... }
{ "activity_id": "c2", "schedule": { "repeat": "daily", "time": "07:30" }, ... }
```

`time` is local time in `Asia/Kuala_Lumpur`. On reset, the backend turns the rule into `starts_at` (UTC ISO) for the next matching occurrence: today if that time has not passed yet, otherwise the next matching day. The API still returns `CommunityActivity.starts_at`, so the API contract does not change. The frontend mock layer must compute `starts_at` with the same rule.

---

## 10. Development Setup

### 10.1 Repository Structure

One repository (monorepo):

```
temanmu/
├── frontend/              React + Vite + Tailwind (all pages)
│   ├── src/
│   │   ├── landing/       Landing page
│   │   ├── dashboard/     Township dashboard and incident response
│   │   ├── caregiver/     Caregiver mobile app (PWA)
│   │   ├── home/          3D home, characters, scenarios, sensor gateway (see 10.4)
│   │   ├── slides/        Pitch slides
│   │   ├── api/           REST client, WebSocket client, shared store
│   │   └── mocks/         Mock API layer in a SharedWorker (see 10.3)
│   └── .env.example
├── backend/               Python FastAPI
│   ├── app/
│   │   ├── main.py        App, CORS, routers, WebSocket endpoint
│   │   ├── api/           REST routes
│   │   ├── rules/         Pure status rules engine (no I/O)
│   │   ├── timers/        Grace and reminder timers (asyncio)
│   │   ├── realtime/      WebSocket connection manager and broadcast
│   │   ├── services/      Monitoring, companion, neighbours, notifications, reset
│   │   ├── db/            Models, queries, SQL migrations
│   │   └── settings.py    pydantic-settings
│   ├── requirements.txt
│   └── .env.example
├── shared/
│   └── seed.json          Single source of seed data (section 9)
└── README.md              How to run everything
```

### 10.2 Local Setup

| Item | Value |
| --- | --- |
| Frontend URL | `http://localhost:5173` |
| Backend URL | `http://localhost:8000` (API docs at `/docs`) |
| WebSocket URL | `ws://localhost:8000/ws` |
| Browser | Latest Chrome (demo browser) |
| Python | 3.11+ |
| Node | 20+ |

**`backend/.env.example`**

```
DATABASE_URL=postgresql://...      # Supabase Postgres connection string
GRACE_PERIOD_SECONDS=15
REMINDER_INTERVAL_SECONDS=15
VOICE_CALL_RING_SECONDS=2
CONTROLLABLE_UNIT_ID=A-105
SEED_FILE=../shared/seed.json
CORS_ORIGINS=http://localhost:5173
DEMO_TIMEZONE=Asia/Kuala_Lumpur    # local time for activity schedules and reason-line clock times
NEIGHBOUR_MIN_OVERLAP_MINUTES=30
NEIGHBOUR_EARLY_RISER_BEFORE=06:30
```

**`frontend/.env.example`**

```
VITE_USE_MOCK=false                # true (or unset) = run without the backend (section 10.3)
# Only for a separately hosted frontend; in dev, Vite proxies /api and /ws to localhost:8000
# VITE_API_BASE_URL=https://your-backend-host
# VITE_WS_URL=wss://your-backend-host/ws
```

The Vite proxy also lets a phone on the same Wi-Fi open the caregiver app from the laptop.

**Run commands**

```
# backend (single worker, required for timers and WebSocket)
cd backend && pip install -r requirements.txt
python -m app.db.migrate             # applies SQL migrations, safe to re-run
uvicorn app.main:app --port 8000

# frontend
cd frontend && npm install && npm run dev
```

**Database:** SQL migration files live in `backend/app/db/migrations/` (`001`–`006`) and are applied to the Supabase project with `python -m app.db.migrate`. After migrating, call `POST /api/demo/reset` once to load seed data.

**Secrets:** never commit real `.env` files. Only `.env.example` is committed.

### 10.3 Mock API (frontend works without the backend)

So the frontend can start on day one, it ships a mock layer that follows the API contract exactly.

| Item | Requirement |
| --- | --- |
| Switch | Mock mode is the default; `VITE_USE_MOCK=false` uses the real backend. No component code changes. |
| Shared mock | The mock backend runs in a browser **SharedWorker**, so the dashboard, caregiver app and 3D view tabs share one mock session, just as they share the real backend. |
| REST mocks | Every endpoint in section 8 returns contract-shaped data built from `shared/seed.json`, including the status rules, timers and companion features. |
| WebSocket mock | The mock emits `snapshot` on connect, plus the other event types in section 8.6. |
| Compressed time | In mock mode the inactivity scenarios jump the demo clock (labelled "Demo time jump") instead of waiting for the real quiet gap. |
| Contract changes | Any change to section 8 must update both the backend and the mocks in the same change. |

The backend team can also return the same seed-shaped stub responses from real FastAPI routes early on, so the frontend can switch to the real backend endpoint by endpoint.

### 10.4 3D Home Integration Contract

The 3D home runs as its own page (`/simulator`). It must:

1. Send `POST /api/readings` with the values in section 9.4 when a sensor object is clicked or used in a scenario.
2. Listen to the WebSocket for `incident.updated` (phone ringing, responder arrival), `companion.message_delivered` (phone call animation) and `snapshot` after reset (return the scene to its starting state).
3. Call `POST /api/demo/monitoring` with `active: true` when a scenario starts and `false` when it stops.
4. Provide the scenario player, the meter readout panel and the sensor view (section 5.2).
5. Use `unit_id` `A-105` for all readings.

---

## 11. Unique Value Proposition

**TemanMu turns everyday household utility data into a privacy-first safety net for elderly residents living alone: it notices when their routine breaks, gets a human to check on them, gives families daily reassurance and helps residents connect with the neighbours around them, without cameras, wearables or apps for the resident.**

What the demo proves:

1. **No surveillance.** The system sees only water, electricity and door data. The 3D home is for the audience only, and its sensor view shows exactly what TemanMu receives.
2. **Personal, not one-size-fits-all.** Alerts compare against each resident's own usual quiet gap, shown live in the progress bar.
3. **Fewer false alarms through cross-checking.** Water triggers, the door and electricity together recognise outings so they stay silent, and water or electricity activity during the grace period cancels an alert before anyone is bothered. A simulated call to the resident comes first, so families are only alerted if she doesn't answer.
4. **Zero tech burden on the elderly.** Confirmation is passive, plus a simulated voice call. The resident never touches an app.
5. **A clear human response, end to end.** Caregiver and township are notified together and reminded until someone responds. The caregiver can check in remotely or ask for a visit; the guard takes the visit, records an outcome and, if needed, a 999 handoff. A case where safety couldn't be verified can't be closed by accident.
6. **More than an alarm.** On normal days, families get morning reassurance and a view of Mum's day on their phone, can invite her to nearby activities, and can match her with a Community Buddy who shares her interests.
7. **Friendships from shared routines.** TemanMu already knows roughly when residents go out, so with consent it introduces neighbours whose days naturally cross, through a human coordinator, without ever revealing anyone's times.
8. **Built for the township.** One dashboard covers a whole block (144 units) and surfaces only the homes that need attention, and the architecture treats the simulator as hardware, so real meters can replace it without changing the backend.

---

## 12. Assumptions and Open Items

| # | Item | Current assumption | Owner to confirm |
| --- | --- | --- | --- |
| 1 | 3D home build | Built with React Three Fiber as its own page, meeting the integration contract in section 10.4 | Done |
| 2 | "Day start" for morning reassurance | Demo reset marks the start of the day | Team |
| 3 | Electricity reading | Sends power in kW, with activity defined as above `standby_power_kw` | Backend |
| 4 | Background units | Fixed scripted states set at reset (mostly Routine, one Possible Away). They do not change during the demo | Team |
| 5 | Names on acknowledgement | Fixed demo names per role, defined in seed data (section 9.5) | Team |
| 6 | Internet at venue | Supabase needs internet. Bring a phone hotspot as backup. Optional local Supabase via CLI as fallback | Backend |
| 7 | "Call Mum" button | Simulated, no real call | Team |
| 8 | Community actions | Stored only, with no follow-up flow in the prototype | Team |
| 9 | Buddy data | A few volunteer buddies and the resident's interests are pre-seeded. Demo reset clears the match | Backend |
| 10 | "Thinking of you" messages | Cut from the UI. The API remains | Done |
| 11 | Neighbour rhythms | Seeded per resident (section 9.6), standing in for four weeks of history. Introductions are recorded only; nobody is contacted | Team |
| 12 | Exact scenario timelines | Set in `frontend/src/home/scenarios/definitions.ts`. Must match the seed baselines and `.env` timings | Team |
| 13 | AI agent | Not in the prototype. Possible future work: an AI alert explainer for caregivers, with the rule-based reason line as fallback | Team |
| 14 | Township block size | Floor 1 is live; floors 2–24 are frontend sample data to show scale | Team |

---

## 13. Task Split

Four engineers: two backend, two frontend. Feature IDs refer to section 5.

### Backend 1: Rules and Realtime

Owns everything that decides status and pushes it live.

| Area | Scope |
| --- | --- |
| Reading ingestion | `POST /api/readings` (B1) |
| Rules engine | Pure status rules module (B2, section 7), including `status_reason` text and quiet-gap data |
| Timers | Grace period and reminder timers with `asyncio` (B3) |
| Incident lifecycle | Create, grace, notified, reminders, acknowledge, close, auto-resolve, including `POST /api/incidents/{id}/acknowledge` and `/close` |
| Simulated voice call | Incident timeline voice-call events (B5) |
| Realtime | WebSocket endpoint, connection manager, all broadcasts in section 8.6 (B4) |

**First deliverable (unblocks others):** WebSocket endpoint that sends `snapshot` from seed data, and `POST /api/readings` accepting contract-shaped readings.

### Backend 2: Data, APIs and Companion

Owns the database, seed data and every endpoint outside the incident lifecycle.

| Area | Scope |
| --- | --- |
| Database | Supabase schema and migrations (section 8.8), data access functions used by Backend 1 (B9) |
| Seed and reset | `shared/seed.json`, seed loading, `POST /api/demo/reset` (B6, B7) |
| Read APIs | All `GET` endpoints in section 8.3, including `GET /api/config` |
| Notifications | Notification records, `POST /api/notifications/read` |
| Companion and community | Message presets, `POST /api/companion/messages` (including the `companion.message_delivered` broadcast via Backend 1's broadcaster), buddy matching (B10), same-hour neighbours (B11), community activities and responses |
| Setup | Settings and `.env` (B8), CORS, `requirements.txt`, backend part of the README |

**First deliverable (unblocks others):** `shared/seed.json`, database schema, and seed-shaped `GET /api/units` and `GET /api/config`.

**Backend handshake:** agree in the first session on the data access function signatures (Backend 2 provides) and the broadcast function (Backend 1 provides), so both can work in parallel.

### Frontend 1: Shell, Data Layer and Caregiver View

Owns the app frame, all communication with the backend, and the Caregiver view.

| Area | Scope |
| --- | --- |
| App shell | Page routing, landing page, PWA setup, theme toggle, sound and mute (G1–G6) |
| Data layer | REST client, WebSocket client with auto-reconnect, shared state store fed by `snapshot` and events, countdowns computed from deadlines (G8) |
| Mock layer | `VITE_USE_MOCK` switch, SharedWorker mock from `seed.json` (section 10.3) |
| Caregiver app | Status card, call button, Mum's day, updates feed, responses, community activity, buddy, same-hour neighbour, settings (C1–C9) |
| 3D home page | The page that hosts the 3D home, following section 10.4 |

**First deliverable (unblocks others):** app shell and page routing, plus the data layer running on mocks, so Frontend 2 can build views against live-looking data.

### Frontend 2: Township View and Incident Components

Owns the Township view and the incident components shared by both roles.

| Area | Scope |
| --- | --- |
| Block view | 24-floor map, three-floor lens, unit tiles with quiet-gap bars, status distinction, go-to-unit search (T1–T5) |
| Needs attention | Alert list, filter chips (T6) |
| Incident response | Auto-opening dialog with I'll Check Now, outcome and note, 999 handoff (T7) |
| Shared incident components | Outcome logging and escalation, reused by the caregiver app's incident screen (C5) |

**First deliverable (unblocks others):** shared incident components, so Frontend 1 can drop them into the Caregiver view.

### 3D Home

Builds the simulated home to the integration contract in section 10.4, covering features S1–S11. Frontend 1 provides the page it runs in.

### Integration Order

1. Frontend runs fully on mocks while the backend builds the first deliverables.
2. Frontend switches to the real backend endpoint by endpoint (`VITE_USE_MOCK=false`).
3. 3D home connects to the real backend through `POST /api/readings` and the WebSocket.
4. Full scenario runs end to end on one laptop.
