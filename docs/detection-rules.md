# TemanMu Detection Rules

How TemanMu turns door, water and electricity readings into a unit status, when it raises a
concern, and what closes it. Each section covers one situation. Section 4 covers combined
situations.

Sources: [`backend/app/rules/engine.py`](../backend/app/rules/engine.py),
[`backend/app/services/monitoring.py`](../backend/app/services/monitoring.py),
[`backend/app/rules/reasons.py`](../backend/app/rules/reasons.py),
[`backend/app/settings.py`](../backend/app/settings.py). Rule IDs (R1–R6, T1–T2, N1–N3, P1, B1–B2,
U1–U3, A1) match the comments in that code.

---

## 0. Unit statuses

| Status | Meaning |
|---|---|
| `routine` | At home, normal |
| `possible_away` | Probably out of the house |
| `unusual_inactivity` | Concern raised: grace period, simulated call to the caregiver |
| `unresolved_concern` | Nobody answered: caregiver and township both alerted |

## 1. What counts as activity

| Sensor | Activity | Not activity (no status change, **R6**) |
|---|---|---|
| Door | `open` | `closed` |
| Water | flow > 0 L/min | 0 (tap off) |
| Electricity | power > the unit's standby kW (seed values 0.10–0.15 kW) | at or below standby |

A repeated reading of an unchanged state (for example a second "water still flowing" sample) is
not new activity. It does not resolve incidents and does not count as a fresh event.

---

## 2. One sensor at a time (no incident open)

### Door opens

| Status now | Water or electricity in use? | Result | Rule |
|---|---|---|---|
| `routine` | Neither in use | → `possible_away`: "Door opened at HH:MM, then no water use and electricity back to standby: probably out" | R3 / P1 |
| `routine` | Water and/or electricity in use | Stays `routine`: "Door opened at HH:MM while … was in use: at home" | N3 |
| `possible_away` | Either | → `routine`: "Door opened at HH:MM: back home" | R2 / B1 |

### Water starts flowing

| Status now | Result | Rule |
|---|---|---|
| `routine` | Stays `routine`; the quiet-gap clock resets | R5 / N1 |
| `possible_away` | → `routine`: "… water use detected: back home" | R4 / B2 |

### Electricity rises above standby

| Status now | Result | Rule |
|---|---|---|
| `routine` | Stays `routine`; the reason line updates. **The quiet-gap clock does not reset** (only water resets it) | R5 / N2 |
| `possible_away` | → `routine`: "… electricity use detected: back home" | R4 / B2 |

---

## 3. Timer rules (fire when nothing happens)

These run only while the demo watch is on for the unit (`POST /api/demo/monitoring`). When
several checks are due, the earliest one fires.

| Rule | Condition | Default length | Opens an incident with |
|---|---|---|---|
| **T1 Quiet gap** | `routine`, no water use since the last water activity or caregiver confirmation | per unit (`usual_quiet_gap_seconds`, seed 30–50 s; A-105 is 5 s, see below) | "No water use for X, longer than usual maximum of Y. Last door event … Electricity at standby / in use" (U1) |
| **T2 Outing too long** | `possible_away` longer than the usual outing | per unit (`usual_outing_seconds`, seed 40–60 s) | "Door opened at HH:MM, then no activity for X, longer than usual outing of Y" (U2) |
| **Continuous water** | Water flowing without a break | `continuous_water_seconds` = 45 s | "Water has continued flowing longer than expected … tap left on or a leak" |
| **Sustained power** | Power > standby + `high_power_above_standby_kw` (1.0 kW) without a break | `high_power_seconds` = 45 s | "Electricity use has stayed unusually high …" |

### Quiet-gap fast-forward (demo only)

A-105, the unit the simulator controls, has `usual_quiet_gap_seconds` = 5 in
[`shared/seed.json`](../shared/seed.json). The rules engine waits these real 5 seconds; nothing
in the backend is sped up.

In the Unusual Inactivity and False Alarm Recovery scenarios, the simulator shows those
5 seconds as a fast-forward card counting from 0h 00m to 4h 00m, the 4-hour quiet gap of the
story ([`HomeEnvironment.tsx`](../frontend/src/home/HomeEnvironment.tsx), `QuietGapOverlay`).
The 4 hours is display-only: it is a fixed constant in the frontend, not read from the backend.

The scenario turns on the demo watch only when it reaches the quiet-gap step, so the walk before
it does not use up the 5 seconds.

---

## 4. Combined situations

| Situation | What happens |
|---|---|
| Water flowing while `routine` | T1 is skipped; the continuous-water rule (45 s) watches instead |
| Door opens while the kettle is on or the tap is running | Treated as still home (N3), not an outing |
| Door opens, then nothing (water 0, power at standby) | `possible_away`; if no activity within the usual outing, T2 opens an incident |
| Door opens, then water or power is used | Back home (R4); the T1 clock restarts from that moment |
| Only electricity in use for a long time, no water | T1 can still fire; its reason shows "Electricity in use (x kW)". If power is also above standby + 1 kW for 45 s, sustained power may fire first |
| Water and high power both sustained | Both deadlines are tracked; whichever is due first opens the incident |
| Caregiver records a phone confirmation while `possible_away` | → `routine`. T1 then counts from the confirmation: "No water use since confirmed contact with …" |

---

## 5. Away periods (declared by the caregiver)

| Situation | What happens |
|---|---|
| Caregiver tries to add an away period (Stop Tracking) while an incident is open | Refused: "Record an outcome for the current alert before stopping tracking" |
| During an away period | T1 and T2 are paused |
| Away period ends | The T1/T2 clock restarts from the end time. If it fires: "Away period ended at HH:MM, then no activity at home for X. … may not be back yet." (U3) |
| Continuous water or sustained power during an away period | Keep running; they are not paused |
| Door opens or water starts during an away period | Once per period, a caregiver notice: "Front door opened / Water used at HH:MM while … is marked away." Electricity alone does **not** send this notice |
| Caregiver answers **Resident returned** | The away period ends now and monitoring restarts |
| Caregiver answers **Known visitor** | Recorded only |
| Caregiver answers **Request home check** | Incident opens directly in `notified` (no call: nobody is home to call). The township guard closes it with a home-check outcome |

---

## 6. After an incident opens

### Lifecycle

1. **Grace** (`grace_period_seconds` = 20 s): status `unusual_inactivity`; simulated call to the
   caregiver rings for `voice_call_ring_seconds` = 18 s, then "No answer (simulated)".
2. **Notified**: status `unresolved_concern`; alert to caregiver and township together; reminders
   every `reminder_interval_seconds` = 15 s.
3. **Acknowledged**: township takes the visit; reminders stop.
4. **Closed**: only by the person who acknowledged it, with an outcome. The unit returns to
   `routine` and the quiet gap restarts.

### New sensor activity during an open incident (R1 / A1)

| Incident type | New door / water / power activity |
|---|---|
| Quiet gap, outing, after-away | **Auto-resolves**: "Resolved: … detected during grace period / during the check". Silent if still in grace; notifies both sides if they had already been alerted |
| Continuous water, sustained power | **Does not resolve**: a meter cannot show the resident is safe |
| Home check (away period) | **Does not resolve**: activity is the concern here |
| Responder recorded "unable to verify" or "called 999" | **Does not resolve** |

### Closing without sensor activity

- **Demo call confirmed** during grace → closed `resident_ok`.
- **Caregiver**: "checking in" → "resident confirmed safe" (only while `notified`, and only after
  checking in). "Request township visit" is logged but does not close the incident.
- **Township close outcomes**:
  - Normal incidents: Resident OK, Assistance provided, Sent to hospital (see section 7), Resident was away.
  - Home checks: Home secure, Family or helper at home, Resident back home (also ends the away
    period), Security concern.
- If "unable to verify" was recorded without a 999 call, the incident can only close as
  **Resident OK**.

---

## 7. Resident in hospital

Closing an incident as **Sent to hospital** sets `care_state = in_hospital` on the unit. This is
kept separate from the status, so later home alerts do not erase it.

| Situation | What happens |
|---|---|
| Door, water or electricity readings | Latest values are stored, but **status never changes** |
| T1 quiet gap, T2 outing | Paused |
| Continuous water, sustained power | **Keep running** |
| Away-activity notice, morning reassurance | Not sent |
| An away period expires, or sensor activity is seen | Does **not** clear hospital state |
| Designated caregiver confirms the resident is home (Return Home) | → `routine`, `care_state = home_monitoring`, any active away period ends, the quiet-gap clock restarts from the confirmation. Refused while an incident is open |

---

## 8. Other notifications

- **Morning reassurance**: the first activity of the day (no incident open, not away) sends the
  caregiver one message, for example "…'s day has started. Water used at home."

---

## Behaviours worth knowing

- Electricity use does not reset the quiet-gap timer; only water does.
- Electricity used during an away period sends no caregiver notice.
- Power counts as activity just above standby, but the high-power alarm needs standby + 1 kW.
- Only the caregiver's Return Home confirmation ends hospital state; sensor activity cannot.
