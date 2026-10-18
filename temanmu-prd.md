# TemanMu: Product Requirements Document (First-Round Prototype)

**Scope:** Hackathon prototype for Sime Darby Property Township of Tomorrow 2026
**Companion document:** [temanmu.md](temanmu.md) (full proposal)
**Readers:** frontend, backend and 3D (ChatGPT Astra) builders, and the UI design pass

This PRD defines **what** the prototype does. All visual design (colours, typography, icons, spacing, layout styling) is intentionally left to the UI design pass. Where this document says a status must "stand out" or "look calm", it describes intent, not styling.

---

## 1. Problem Statement

Malaysia's population is ageing (8.4% aged 65+ in Q2 2026), and a growing share of older adults live independently. When an elderly resident living alone collapses or becomes unwell at home, it can take hours or days before anyone notices.

Existing solutions each have a gap:

- **Cameras** are intrusive in private spaces.
- **Wearables** are forgotten, left uncharged, or removed in the bathroom, where falls are common.
- **Dedicated indoor sensors** add hardware and continuous movement tracking.
- **Single-signal utility monitoring** (water only, fixed threshold) produces false alarms, and often has no clear process for who responds.

**How might we** use everyday household utility data (water, electricity and the front door) to notice when an elderly resident's routine breaks, get a human to check on them quickly, and give families daily reassurance, without watching the resident's every movement?

---

## 2. Prototype Scope

### In scope

- One web application on a single screen: a **simulated 3D home** on the left and a **dashboard** on the right, separated by a draggable divider.
- Two dashboard roles, switched with a role switcher: **Township Operator** and **Caregiver**.
- A Python backend that ingests simulated sensor readings, runs the status rules and timers, and pushes updates live.

### Out of scope (pitch slides only)

- Real smart meter or door sensor hardware.
- Resident-facing app or resident mode.
- Real automated voice call (it is **simulated** in the prototype).
- Separate neighbour view (neighbours are described verbally as opt-in responders receiving the same alert as the township guard).
- Native mobile app (the Caregiver view is web; mobile is future work).
- Machine-learned baselines (baselines are pre-filled values in the prototype).
- Automatically contacting emergency services. A human-initiated 999 handoff is supported by the incident workflow.
- "Appliance left on" detection (future work, see section 7).

---

## 3. Roles

| Role | Who | Where in the UI |
| --- | --- | --- |
| **Township Operator** | Township management and guard, merged into one role | Dashboard, Township tab |
| **Caregiver** | The resident's designated family member | Dashboard, Caregiver tab |
| **Presenter** (demo only) | The team member running the pitch | Simulator controls in the 3D home panel |
| **Resident** (passive) | The elderly person, shown as the animated character | No UI. Confirms wellbeing passively through activity |

---

## 4. User Stories

### Caregiver

- As a caregiver, I want a short message each morning when Mum's routine starts, so I know she is fine without calling to check.
- As a caregiver, I want to be alerted when Mum's routine breaks and she cannot be reached, so I can act quickly.
- As a caregiver, I want reminders until someone responds, so an alert is never silently missed.
- As a caregiver, I want to tap "I'll Check Now" so the township knows I'm handling it and stops reminding everyone.
- As a caregiver, I want to see who has acknowledged an alert and its outcome, so I know the situation is resolved.
- As a caregiver, I want to see community activities near Mum and invite her or join with her, so she stays socially connected without needing to use technology herself.
- As a caregiver, I want to send Mum a short "thinking of you" message that reaches her as a voice call, so she hears from me even when I can't call, without her needing an app.
- As a caregiver, I want to request a Community Buddy for Mum and see who she's matched with, so she has a friendly neighbour to join activities with.

### Resident (companionship)

- As an elderly resident, I want to hear warm messages from my family through an ordinary phone call, so the system doesn't only contact me when something is wrong.

### Township Operator

- As a township operator, I want to see the status of every enrolled unit at a glance, so I can focus on the ones that need attention.
- As a township operator, I want to see **why** a unit was flagged (for example, water silent longer than this resident's usual gap), so I trust the alert.
- As a township operator, I want to be alerted at the same time as the caregiver when a resident cannot be reached, so help can arrive even if the family is far away.
- As a township operator, I want to acknowledge and close an incident with an outcome, so there is an accountable record.

### Resident (passive)

- As an elderly resident, I want the system to confirm I'm fine from my normal activity, so I'm never asked to use an app.
- As an elderly resident, I want my outings to be left alone, so my family isn't alarmed every time I leave home.

### Presenter

- As a presenter, I want one-click scenarios, so the demo runs reliably under pressure.
- As a presenter, I want to trigger sensors manually by clicking objects in the home, so judges can see it is live and try it themselves.
- As a presenter, I want to reset the demo in one click, so each judge sees a clean run.
- As a presenter, I want timings to be shortened through configuration, so a multi-hour real-world flow fits into a few minutes.

---

## 5. Features

Priority: **P0** is required for the demo, **P1** is strongly wanted, **P2** is optional polish.

### 5.1 Global Shell

| ID | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| G1 | Split screen | 3D home panel on the left, dashboard on the right, on a single page. | P0 |
| G2 | Draggable divider | Resizable split with minimum widths on both panels. Double-click resets to the default split. Position persists across page refresh. | P1 |
| G3 | Role switcher | Switch the dashboard between Township and Caregiver views without leaving the page. | P0 |
| G4 | Inactive-role badge | When a new notification arrives for the role not currently shown, its switcher tab shows a badge until viewed. | P0 |
| G5 | Light/dark theme toggle | User can switch between light and dark themes. | P1 |
| G6 | Sound with mute | Distinct subtle sounds for morning reassurance, new alert, and reminder. On by default, with a mute toggle. The demo must be fully understandable with sound muted. | P1 |
| G7 | Screen support | Designed for 1920×1080. Must remain fully usable at 1366×768 with nothing hidden. Not required to support mobile. | P0 |
| G8 | Config-driven durations | The UI never hard-codes durations. All countdowns and duration labels use values from the backend (`GET /api/config` and per-unit baselines). | P0 |
| G9 | Language | English only. | P0 |

### 5.2 Simulated 3D Home (built with ChatGPT Astra)

| ID | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| S1 | Sims-like home | A Sims-style 3D home for the controllable unit, containing a water point (tap), an electricity point (kettle or light) and the main door. Must embed in the web app. | P0 |
| S2 | Animated resident | A fully animated elderly character who walks between rooms in sync with sensor events. **Fallback:** if walking animation is not ready, the character snaps between fixed positions per scenario. | P0 (fallback), P1 (walking) |
| S3 | Clickable sensor objects | Clicking the tap, kettle/light or door triggers the character's action and sends the corresponding reading to the backend. | P0 |
| S4 | Meter readout panel | A panel inside the 3D home showing current water flow, electricity power and door state with last-event time. Updates as readings are sent. | P0 |
| S5 | Audience-only label | A permanent label stating the 3D view is for the audience only and TemanMu receives only water, electricity and door data. | P0 |
| S6 | Scenario buttons | Four one-click scenarios (see section 6.1). Each plays a scripted sequence of character actions and sensor readings. | P0 |
| S7 | Reset demo | Button with a confirmation step. Calls `POST /api/demo/reset` and returns the character and scene to the starting state. | P0 |
| S8 | Incoming companion call | When a "thinking of you" message is delivered, the phone rings in the 3D home. The character walks to the phone, picks it up, and a speech bubble shows the message. She then puts the phone down and returns to what she was doing. Triggered by the `companion.message_delivered` WebSocket event. | P1 |

The character is for the audience only. **The character never sends data.** Only sensor-object events (tap, kettle/light, door) produce readings. Answering the companion phone call is **not** a sensor event and does not count as activity for the status rules.

The 3D home both **sends** readings (REST) and **receives** companion call events (it subscribes to the same WebSocket as the dashboard).

### 5.3 Township View

| ID | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| T1 | Unit grid | Six units: one controllable (the 3D home unit, highlighted) and five scripted background units. Each shows unit ID, resident name and status. Units in Unresolved Concern sort to the top. | P0 |
| T2 | Status distinction | The four statuses must be clearly distinguishable without relying on colour alone. Unresolved Concern must draw attention. Possible Away must look calm, reflecting that it is silent. | P0 |
| T3 | Unit detail | Shows the selected unit's live water, electricity and door timelines, and a plain-language **reason line** explaining the current status. The reason line must name **every signal that decided the status**, so the water + electricity + door cross-check is visible (see examples below). The controllable unit is selected by default. Clicking a background unit shows its detail. | P0 |
| T4 | Quiet-gap progress bar | In unit detail, shows how long water has been silent against this resident's usual maximum quiet gap. Visibly changes state when the usual maximum is exceeded. | P0 |
| T5 | Baseline note | Indicates the baseline is "learned from history (simulated)". | P1 |
| T6 | Incident panel | When the selected unit has an active incident, shows the incident timeline (detected, voice call, notifications, reminders, acknowledgement), the grace countdown or reminder count, the "I'll Check Now" button, and outcome logging. When there is no incident, this area shows the unit's latest reassurance state. | P0 |
| T7 | Incident history | Closed incidents per unit with outcome and who resolved them. | P1 |

**Reason line examples** (wording is illustrative; the backend generates `status_reason`):

| Situation | Example reason line |
| --- | --- |
| Routine, day started | "Water and electricity activity within usual routine" |
| Possible Away | "Door opened at 08:02, then no water use and electricity back to standby: probably out" |
| Returned from Possible Away | "Door opened at 11:40 and electricity use detected: back home" |
| Unusual Inactivity | "No water use for 0:34, longer than usual maximum of 0:30. No door event" |
| Auto-resolved by electricity | "Resolved: electricity use detected (kettle on) during grace period" |
| Auto-resolved by water | "Resolved: water use detected during grace period" |

### 5.4 Caregiver View (web)

| ID | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| C1 | Resident status header | Resident name, unit, current status and last-updated time. | P0 |
| C2 | Call button | "Call Mum" button (simulated, no real call). | P1 |
| C3 | Notification feed | Morning reassurance, safety alerts and reminders in time order. Alerts include "I'll Check Now". | P0 |
| C4 | Acknowledge and close | Caregiver can acknowledge and log an outcome, using the same flow as the Township Operator. | P0 |
| C5 | Community card | Shows an upcoming community activity near the resident, with "Invite Mum" and "Join together" actions. | P1 |
| C6 | "Thinking of you" message | Caregiver picks one of 3–4 **preset** messages and sends with one tap (no custom text). It is delivered to the resident as a **one-way simulated voice call**, e.g. "Your daughter Sarah says: Thinking of you, Mum." The resident cannot reply. The feed shows the message as delivered, tagged simulated. | P1 |
| C7 | Community Buddy match | Caregiver taps "Request a Buddy". The backend matches a pre-seeded volunteer by shared interest and returns them. The view shows the matched buddy's name, shared interest and next activity together, with a simulated tag. | P1 |

**Companion intent:** C5–C7 show that TemanMu supports companionship on normal days, not only during alerts. The resident stays tech-free: the caregiver acts on her behalf, and anything that reaches her arrives as an ordinary phone call or a person.

### 5.5 Backend

| ID | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| B1 | Reading ingestion | Accepts sensor readings over REST, as a real meter gateway would. | P0 |
| B2 | Rules engine | Applies the status rules (section 7) per unit. Implemented as a separate pure module so it can be reused with real data later. | P0 |
| B3 | Timers | Grace period and reminder timers run on the backend and survive a browser refresh. Single worker process. | P0 |
| B4 | Live push | Pushes all state changes to connected dashboards over WebSocket. | P0 |
| B5 | Simulated voice call | Writes voice-call events into the incident timeline during the grace period. Also delivers caregiver "thinking of you" messages as simulated calls. | P0 |
| B10 | Buddy matching | Matches a resident with a pre-seeded volunteer buddy by shared interest. Simple lookup, no algorithm required in the prototype. | P1 |
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
5. The Caregiver tab badge appears. The presenter switches to Caregiver to show the message.

**Scenario 2: Going Out** (shows the silent away status; can be cut if time is short)

1. The character walks to the door and leaves. The simulator sends a door reading.
2. With no further water or electricity activity, the backend sets Possible Away.
3. No notification is sent to anyone.
4. The character returns and the simulator sends a door reading. The unit returns to Routine.

**Scenario 3: Unusual Inactivity** (shows the full safety flow)

1. The character collapses in the living room. The simulator sends no further readings.
2. The quiet-gap progress bar fills. When water silence exceeds the resident's usual maximum, the backend sets Unusual Inactivity and starts the grace period.
3. The incident timeline shows the simulated voice call ("Calling Mum... no answer"), and the grace countdown runs.
4. The grace period ends with no activity. The backend notifies the caregiver and the township at the same time.
5. The backend sets Unresolved Concern. If nobody acknowledges, it sends reminders at the configured interval.
6. In the presenter-only mock, Guard Ali acknowledges the township alert and a 3D responder reenacts arriving from outside, entering, and checking Mum. The staged door movement sends no resident sensor reading. The incident remains acknowledged until a human records the outcome in the dashboard (see 6.2). In live mode the scene waits for a real township acknowledgement; it never dispatches a person automatically.

**Scenario 4: False Alarm Recovery** (shows how false alarms are avoided)

1. Starts like Scenario 3 and reaches Unusual Inactivity. The simulated voice call starts.
2. During the grace countdown, the character gets up and uses the tap. The simulator sends a water reading.
3. The backend cancels the voice call, resolves the incident as "Resident activity detected" and returns the unit to Routine.
4. Nobody is notified.

### 6.2 Acknowledge and Close an Incident

1. The caregiver or township operator taps "I'll Check Now".
2. The backend records the acknowledgement and stops reminders for everyone.
3. Both views show who acknowledged and when. The other role's switcher tab shows a badge.
4. The person who acknowledged logs one outcome: **Resident OK**, **Assistance provided** or **Resident was away**.
5. The backend closes the incident, writes it to history and returns the unit to Routine.

**Emergency handoff:** After acknowledging, the responder can record that resident safety could not be verified, or that they personally called 999. The latter records a reported call, not confirmed dispatch. Both actions stay on the open incident timeline and notify caregiver and township; neither action places a call. The interface offers a `tel:999` link and prompts the caller to provide the full site address, unit and access details. The case remains open until the responder records the later outcome. Sensor activity cannot automatically close it. If safety could not be verified, the case cannot be closed as "assistance provided" or "resident away" without a recorded emergency handoff; a later in-person confirmation that the resident is OK can close it.

**Auto-resolve:** at any point before closing, any water, electricity (above baseline) or door reading for the unit resolves the incident as "Resident activity detected".

### 6.3 Manual Sensor Trigger

1. The presenter or a judge clicks the tap, kettle/light or door in the 3D home.
2. The character walks to the object and performs the action.
3. The simulator sends the reading. The meter panel updates.
4. The dashboard reacts according to the rules.

### 6.4 Companion Flows

**Send a "thinking of you" message**

1. In the Caregiver view, the caregiver taps one of the preset messages.
2. The backend records a one-way simulated voice call to the resident, marks it delivered, and broadcasts `companion.message_delivered`.
3. In the 3D home, the phone rings and the character answers. A speech bubble shows the message.
4. The Caregiver feed shows "Delivered to Mum by voice call", tagged simulated.

**Request a Community Buddy**

1. In the Caregiver view, the caregiver taps "Request a Buddy".
2. The backend matches a pre-seeded volunteer who shares one of the resident's interests.
3. The Caregiver view shows the matched buddy, the shared interest and the next activity they could attend together.
4. The township operator sees the match in the unit detail (P2).

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

| Status | Enters when | Leaves when | Action |
| --- | --- | --- | --- |
| **Routine** | Default state. Also entered on any activity while in Possible Away, or when an incident is resolved or closed. | Rules below fire. | On the day's first activity, create a morning reassurance notification for the caregiver. |
| **Possible Away** | A door event is followed by no water or electricity activity. | Another door event or any activity returns to Routine. Time since the door event exceeding `usual_outing_seconds` moves to Unusual Inactivity. | None (silent). |
| **Unusual Inactivity** | Not in Possible Away, and time since the last water activity exceeds `usual_quiet_gap_seconds`. Or Possible Away timed out. | Any activity resolves it ("Resident activity detected"). The grace period ending with no activity notifies both roles and moves to Unresolved Concern. | Create an incident. Start the grace timer (`GRACE_PERIOD_SECONDS`). Log the simulated voice call. |
| **Unresolved Concern** | The grace period ended without activity. | Acknowledged and closed by either role, or any activity resolves it. | Notify caregiver and township. Repeat reminders every `REMINDER_INTERVAL_SECONDS` until acknowledged. |

Water silence alone can trigger Unusual Inactivity. Electricity activity counts as confirmation (resolves the incident) but does not reset the water quiet-gap timer before an incident starts.

**Role of each signal** (state this clearly in the pitch):

| Signal | Role |
| --- | --- |
| **Water** | Primary trigger. Silence beyond the resident's usual quiet gap starts Unusual Inactivity. |
| **Electricity** | Separates an outing from inactivity after a door event (standby means probably out, use means home). Cancels an incident during the grace period. |
| **Door** | Marks a possible outing, so absence is not mistaken for inactivity. |

**Future work (not in prototype):** an "appliance left on" rule, where a stove, iron or heater left on far longer than usual with no water activity also triggers Unusual Inactivity (for example, a fall while cooking).

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
type Outcome = "resident_ok" | "assistance_provided" | "resident_away" | "resident_activity_detected";

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
    usual_max_seconds: number;         // client computes elapsed from last_water_activity_at
  };
  baseline: Baseline;
  active_incident_id: string | null;
}

interface IncidentEvent {
  type:
    | "detected" | "voice_call_started" | "voice_call_no_answer" | "voice_call_cancelled"
    | "notified" | "reminder" | "acknowledged" | "closed" | "auto_resolved";
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
  closed_at: string | null;
  events: IncidentEvent[];
}

interface Notification {
  notification_id: string;
  role: Role;
  unit_id: UnitId;
  kind:
    | "morning_reassurance" | "alert" | "reminder" | "acknowledged" | "closed" | "auto_resolved"
    | "message_delivered" | "buddy_matched";
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

### 8.4 Dashboard Actions

| Method | Path | Body | Response | Errors |
| --- | --- | --- | --- | --- |
| POST | `/api/incidents/{id}/acknowledge` | `{ "role": Role, "name": string }` | `200` `Incident` | `409` if already acknowledged or closed |
| POST | `/api/incidents/{id}/close` | `{ "role": Role, "name": string, "outcome": "resident_ok" \| "assistance_provided" \| "resident_away" }` | `200` `Incident` | `409` if not acknowledged or already closed. `403` if caller is not the acknowledger |
| POST | `/api/notifications/read` | `{ "role": Role }` | `204` | |
| POST | `/api/community/activities/{id}/respond` | `{ "action": "invite_resident" \| "join_together" }` | `200` `{ "ok": true }` | |
| POST | `/api/companion/messages` | `{ "unit_id": UnitId, "from_name": string, "preset_id": string }` | `201` `CompanionMessage` | `404` if preset does not exist |
| POST | `/api/companion/buddy/request` | `{ "unit_id": UnitId }` | `201` `BuddyMatch` | `409` if already matched. `404` if no buddy shares an interest |

### 8.5 Demo Control

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/api/demo/reset` | none | `200` `{ "units": Unit[] }`. Also broadcasts `snapshot` to all sockets. |

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
| `companion.message_delivered` | A "thinking of you" message is sent. The 3D home uses this to play the phone call | `CompanionMessage` |

The client should reconnect automatically and treat the next `snapshot` as the source of truth.

### 8.7 Configuration (`.env`)

See section 10.2 for the full `.env.example` of each app. Timing values:

```
GRACE_PERIOD_SECONDS=15            # production: 900
REMINDER_INTERVAL_SECONDS=15       # production: 900
```

Per-resident values (`usual_quiet_gap_seconds`, `usual_outing_seconds`, `standby_power_kw`) live in the `resident_profiles` table and are demo-scaled in the seed data.

### 8.8 Data Model (Supabase / Postgres)

| Table | Key columns |
| --- | --- |
| `units` | `unit_id` PK, `resident_name`, `caregiver_name`, `caregiver_relationship`, `controllable`, `status`, `status_reason`, `status_since`, `last_water_activity_at`, `last_door_event_at`, `latest_water_lpm`, `latest_power_kw`, `latest_door` |
| `resident_profiles` | `unit_id` PK/FK, `usual_quiet_gap_seconds`, `usual_outing_seconds`, `standby_power_kw` |
| `readings` | `id` PK, `unit_id` FK, `sensor`, `value_num`, `value_text`, `recorded_at` |
| `incidents` | `incident_id` PK, `unit_id` FK, `state`, `opened_at`, `grace_ends_at`, `next_reminder_at`, `reminder_count`, `ack_role`, `ack_name`, `ack_at`, `outcome`, `closed_at` |
| `incident_events` | `id` PK, `incident_id` FK, `type`, `at`, `actor_role`, `actor_name`, `detail` |
| `notifications` | `notification_id` PK, `role`, `unit_id` FK, `kind`, `message`, `incident_id` FK nullable, `created_at`, `read` |
| `community_activities` | `activity_id` PK, `title`, `starts_at`, `location`, `near_unit_id` FK |
| `community_responses` | `id` PK, `activity_id` FK, `action`, `created_at` |
| `resident_interests` | `unit_id` FK, `interest`, `position` |
| `buddies` | `buddy_id` PK, `name`, `interests` (text[]) |
| `buddy_matches` | `unit_id` PK/FK, `buddy_id` FK, `shared_interest`, `matched_at` |
| `message_presets` | `preset_id` PK, `text` |
| `companion_messages` | `message_id` PK, `unit_id` FK, `from_name`, `preset_id` FK, `text`, `channel`, `status`, `sent_at` |

- `units.latest_water_lpm`, `latest_power_kw` and `latest_door` hold each unit's current values for `Unit.latest`. Background units never receive readings, so these cannot be derived from `readings`. Reset fills them from `seed.json`, and reading ingestion updates them for the controllable unit.
- `resident_interests.position` keeps the interest order from `seed.json`. Buddy matching (section 9.6) depends on this order.

### 8.9 Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | React + Vite + Tailwind |
| 3D home | Built with ChatGPT Astra, embedded in the React app |
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

- Background units (all except A-105) keep their reset status for the whole demo and receive no readings.
- At reset, A-105 has no readings, `last_water_activity_at` is set to the reset time, and the character starts in bed.

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

| Object | Reading when on | Reading when off |
| --- | --- | --- |
| Tap | water `6.0` L/min | water `0` |
| Kettle (or light) | electricity `1.8` kW | electricity `0.15` kW (standby) |
| Door | door `"open"` | door `"closed"` |

### 9.5 Responder Names

| Role | Name used when acknowledging |
| --- | --- |
| Caregiver (A-105) | Sarah Lee |
| Township | Guard Ali |

### 9.6 Companion Data

**Message presets**

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
├── frontend/              React + Vite + Tailwind (dashboard and app shell)
│   ├── src/
│   │   ├── dashboard/     Township and Caregiver views
│   │   ├── simulator/     Integration point for the 3D home (see 10.4)
│   │   ├── api/           REST client and WebSocket client
│   │   └── mocks/         Mock API layer (see 10.3)
│   └── .env.example
├── backend/               Python FastAPI
│   ├── app/
│   │   ├── main.py        App, CORS, routers, WebSocket endpoint
│   │   ├── api/           REST routes
│   │   ├── rules/         Pure status rules engine (no I/O)
│   │   ├── timers/        Grace and reminder timers (asyncio)
│   │   ├── realtime/      WebSocket connection manager and broadcast
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
CONTROLLABLE_UNIT_ID=A-105
SEED_FILE=../shared/seed.json
CORS_ORIGINS=http://localhost:5173
DEMO_TIMEZONE=Asia/Kuala_Lumpur    # local time for activity schedules and reason-line clock times
```

**`frontend/.env.example`**

```
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
VITE_USE_MOCK=false                # true = run without the backend (section 10.3)
```

**Run commands**

```
# backend (single worker, required for timers and WebSocket)
cd backend && pip install -r requirements.txt
uvicorn app.main:app --port 8000

# frontend
cd frontend && npm install && npm run dev
```

**Database:** SQL migration files live in `backend/app/db/migrations/` and are applied to the Supabase project. After migrating, call `POST /api/demo/reset` once to load seed data.

**Secrets:** never commit real `.env` files. Only `.env.example` is committed.

### 10.3 Mock API (frontend works without the backend)

So the frontend can start on day one, it ships a mock layer that follows the API contract exactly.

| Item | Requirement |
| --- | --- |
| Switch | `VITE_USE_MOCK=true` routes all REST and WebSocket traffic to the mock layer. No component code changes. |
| REST mocks | Every endpoint in section 8 returns contract-shaped data built from `shared/seed.json`. Mock Service Worker (MSW) is recommended. |
| WebSocket mock | A mock socket emits `snapshot` on connect, plus the other event types in section 8.6. |
| Mock scenarios | A small developer-only panel (hidden in the demo) can fire scripted event sequences, such as an incident going through grace, notified, reminder and acknowledged, so the dashboard can be built and tested before the rules engine exists. |
| Contract changes | Any change to section 8 must update both the backend and the mocks in the same change. |

The backend team can also return the same seed-shaped stub responses from real FastAPI routes early on, so the frontend can switch to the real backend endpoint by endpoint.

### 10.4 3D Home Integration Contract

The 3D builder chooses freely how the home is built and embedded. Whatever the approach, it must:

1. Send `POST /api/readings` with the values in section 9.4 when the tap, kettle/light or door is clicked or used in a scenario.
2. Listen to the WebSocket for `companion.message_delivered` (phone call animation) and `snapshot` after reset (return the scene to its starting state).
3. Provide the scenario buttons, the meter readout panel and the audience-only label (section 5.2).
4. Use `unit_id` `A-105` for all readings.

---

## 11. Unique Value Proposition

**TemanMu turns everyday household utility data into a privacy-first safety net for elderly residents living alone: it notices when their routine breaks, gets a human to check on them, and gives families daily reassurance, without cameras, wearables or apps for the resident.**

What the demo proves:

1. **No surveillance.** The system sees only water, electricity and door data. The 3D home is for the audience only.
2. **Personal, not one-size-fits-all.** Alerts compare against each resident's own usual quiet gap, shown live in the progress bar.
3. **Fewer false alarms through cross-checking.** Water triggers, the door and electricity together recognise outings so they stay silent, and water or electricity activity during the grace period cancels an alert before anyone is bothered. The reason line shows which signals decided.
4. **Zero tech burden on the elderly.** Confirmation is passive, plus a simulated voice call. The resident never touches an app.
5. **A clear human response.** Caregiver and township are notified together, reminded until someone responds, and every step is recorded.
6. **More than an alarm.** On normal days, families get morning reassurance, can send Mum a "thinking of you" message that reaches her as a simple phone call, and can match her with a Community Buddy who shares her interests.
7. **Built for the township.** One dashboard covers every enrolled unit, and the architecture treats the simulator as hardware, so real meters can replace it without changing the backend.

---

## 12. Assumptions and Open Items

| # | Item | Current assumption | Owner to confirm |
| --- | --- | --- | --- |
| 1 | 3D home build | The 3D builder freely chooses how to build and embed it, as long as it meets the integration contract in section 10.4 | 3D builder |
| 2 | "Day start" for morning reassurance | Demo reset marks the start of the day | Team |
| 3 | Electricity reading | Sends power in kW, with activity defined as above `standby_power_kw` | Backend |
| 4 | Background units | Fixed scripted states set at reset (mostly Routine, one Possible Away). They do not change during the demo | Team |
| 5 | Names on acknowledgement | Fixed demo names per role, defined in seed data (section 9.5) | Team |
| 6 | Internet at venue | Supabase needs internet. Bring a phone hotspot as backup. Optional local Supabase via CLI as fallback | Backend |
| 7 | "Call Mum" button | Simulated, no real call | Team |
| 8 | Community actions | Stored only, with no follow-up flow in the prototype | Team |
| 9 | Buddy data | A few volunteer buddies and the resident's interests are pre-seeded. Demo reset clears the match | Backend |
| 10 | "Thinking of you" delivery | Simulated one-way voice call, with no audio played. Demo reset clears sent messages | Team |
| 11 | Companion call while resident is away or in an incident | Not decided. Default: the call is always shown as answered | Team |
| 12 | Exact scenario timelines | To be decided later. Must match the seed baselines and `.env` timings | Team |
| 13 | AI agent | Not decided. Recommended option: an AI alert explainer for caregivers, with the rule-based reason line as fallback | Team |
| 14 | 3D home owner | Not yet assigned (see section 13) | Team |

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
| Companion and community | Message presets, `POST /api/companion/messages` (including the `companion.message_delivered` broadcast via Backend 1's broadcaster), buddy matching (B10), community activities and responses |
| Setup | Settings and `.env` (B8), CORS, `requirements.txt`, backend part of the README |

**First deliverable (unblocks others):** `shared/seed.json`, database schema, and seed-shaped `GET /api/units` and `GET /api/config`.

**Backend handshake:** agree in the first session on the data access function signatures (Backend 2 provides) and the broadcast function (Backend 1 provides), so both can work in parallel.

### Frontend 1: Shell, Data Layer and Caregiver View

Owns the app frame, all communication with the backend, and the Caregiver view.

| Area | Scope |
| --- | --- |
| App shell | Split screen, draggable divider, role switcher, inactive-role badge, theme toggle, sound and mute (G1–G6) |
| Data layer | REST client, WebSocket client with auto-reconnect, shared state store fed by `snapshot` and events, countdowns computed from deadlines (G8) |
| Mock layer | `VITE_USE_MOCK` switch, REST and WebSocket mocks from `seed.json`, developer mock-scenario panel (section 10.3) |
| Caregiver view | Status header, call button, notification feed, community card, "thinking of you" presets, buddy request (C1–C7) |
| 3D home slot | The left-panel container where the 3D home is embedded, following section 10.4 |

**First deliverable (unblocks others):** app shell with the role switcher, plus the data layer running on mocks, so Frontend 2 can build views against live-looking data.

### Frontend 2: Township View and Incident Components

Owns the Township view and the incident components shared by both roles.

| Area | Scope |
| --- | --- |
| Unit grid | Six units, highlighted controllable unit, status distinction, sorting (T1, T2) |
| Unit detail | Water, electricity and door timelines, reason line, quiet-gap progress bar, baseline note (T3–T5) |
| Incident panel | Incident timeline, grace countdown, reminder count, incident history (T6, T7) |
| Shared incident components | "I'll Check Now" button and outcome logging, built once and used in both the Township and Caregiver views (C4) |

**First deliverable (unblocks others):** shared incident components, so Frontend 1 can drop them into the Caregiver view.

### 3D Home

Not yet assigned. The owner builds the simulated home to the integration contract in section 10.4, covering features S1–S8. Frontend 1 provides the slot it embeds into.

### Integration Order

1. Frontend runs fully on mocks while the backend builds the first deliverables.
2. Frontend switches to the real backend endpoint by endpoint (`VITE_USE_MOCK=false`).
3. 3D home connects to the real backend through `POST /api/readings` and the WebSocket.
4. Full scenario runs end to end on one laptop.
