# TemanMu Detection Rules

How TemanMu turns household readings into a unit status, when it raises a concern, and what
closes it.

Sources: [`backend/app/rules/engine.py`](../backend/app/rules/engine.py),
[`backend/app/services/monitoring.py`](../backend/app/services/monitoring.py),
[`backend/app/rules/reasons.py`](../backend/app/rules/reasons.py),
[`backend/app/settings.py`](../backend/app/settings.py). Rule IDs (R1, R4–R6, T1–T3, N1–N2, B2, C1–C5,
U1, U3–U5, A1) match the comments in that code.

### Madam Lee's home (A-105)

The demo shows one home: Madam Lee's flat. It has water and electricity monitoring, and **no
door sensor**. Her access-card taps at the Block A lift lobby (`POST /api/access-events`) tell
TemanMu when she goes out and comes back. A tap suggests an outing or a return; it never proves
she is safe.

---

## 0. Unit statuses

| Status | Meaning |
|---|---|
| `routine` | At home, normal |
| `possible_away` | Probably out: she tapped out and the home went quiet |
| `unusual_inactivity` | Concern raised: grace period, simulated call to the resident |
| `unresolved_concern` | Nobody answered: caregiver and township both alerted |

## 1. What counts as activity at home

| Signal | Activity | Not activity (no status change, **R6**) |
|---|---|---|
| Water | flow > 0 L/min | 0 (tap off) |
| Electricity | power > the unit's standby kW (seed values 0.10–0.15 kW) | at or below standby |

A card tap is **not** activity at home: it says she passed the lobby, not that she is in the
flat. A repeated reading of an unchanged state (for example a second "water still flowing"
sample) is not new activity either. It does not resolve incidents and does not count as a fresh
event.

---

## 2. Going out, coming back and activity at home (no incident open)

### A card tap

| Situation | Result | Rule |
|---|---|---|
| Taps **out**, home quiet (no water, power at standby) | → `possible_away`: "Tapped out at Block A lift lobby, HH:MM, then no water use and electricity at standby: probably out" | C1 |
| Taps out, but water or power in use | Stays `routine`: "Card tapped out at …, but water or electricity is in use at home" (a lent card, or someone else is home) | C2 |
| Taps **in**, home quiet | → `routine`: "Tapped in at …, HH:MM: on the way home". The tapped-in clock (T3) starts; the quiet-gap clock restarts | C3 |
| Taps in, water or power already in use | → `routine`: "… with activity at home: back home" | C4 |
| No tap at all | Nothing changes: she is assumed to be home, so a quiet home is ordinary inactivity (T1). Assuming she is out could delay help | — |

### Water starts flowing

| Status now | Result | Rule |
|---|---|---|
| `routine` | Stays `routine`; the quiet-gap clock resets | R5 / N1 |
| `routine`, just tapped in | Stays `routine`: "Tapped in at …, and water use detected: back home". T3 stops | C5 |
| `possible_away` (a missed tap in) | → `routine`: "Water use detected: back home" | R4 / B2 |

### Electricity rises above standby

| Status now | Result | Rule |
|---|---|---|
| `routine` | Stays `routine`; the reason line updates. **The quiet-gap clock does not reset** (only water resets it) | R5 / N2 |
| `routine`, just tapped in | Stays `routine`: "Tapped in at …, and electricity use detected: back home". T3 stops | C5 |
| `possible_away` (a missed tap in) | → `routine`: "Electricity use detected: back home" | R4 / B2 |

---

## 3. Timer rules (fire when nothing happens)

These run only while the demo watch is on for the unit (`POST /api/demo/monitoring`). When
several checks are due, the earliest one fires.

| Rule | Condition | Default length | Opens an incident with |
|---|---|---|---|
| **T1 Quiet gap** | `routine`, no water use since the last water activity or caregiver confirmation | per unit (`usual_quiet_gap_seconds`; A-105 is 5 s, shown as 4 hours) | "No water use for X, longer than usual maximum of Y …" (U1) |
| **T2 Not back yet** | `possible_away` after a tap out, longer than the usual outing | per unit (`usual_outing_seconds`; A-105 is 20 s, shown as 3 hours) | detected "Not back yet": "Tapped out at …, HH:MM, and not back yet: out for X, longer than usual outing of Y" (U4) |
| **T3 Tapped in, no activity** | `routine` after a tap in, no water or power use since | `ARRIVAL_WINDOW_SECONDS` = 20 s (demo; a real home would use minutes). Replaces T1 while it runs | detected "Tapped in, no activity at home": "Tapped in at …, HH:MM, then no activity at home for X. She may not have reached the flat." (U5) |
| **Continuous water** | Water flowing without a break | `continuous_water_seconds` = 45 s | "Water has continued flowing longer than expected … tap left on or a leak" |
| **Sustained power** | Power > standby + `high_power_above_standby_kw` (1.0 kW) without a break | `high_power_seconds` = 45 s | "Electricity use has stayed unusually high …" |

---

## 4. Combined situations

| Situation | What happens |
|---|---|
| Water flowing while `routine` | T1 is skipped; the continuous-water rule (45 s) watches instead |
| Taps out, then nothing | `possible_away`; if she hasn't tapped in or used anything within the usual outing, T2 opens "Not back yet" |
| Taps in, then nothing | T3 opens "Tapped in, no activity at home" after 20 s |
| Taps in, then water or power is used | Back home (C5); the T1 clock restarts from the tap in |
| Taps out, back in, out again | The latest tap wins; a tap out cancels a pending T3 |
| Only electricity in use for a long time, no water | T1 can still fire; its reason shows "Electricity in use (x kW)". If power is also above standby + 1 kW for 45 s, sustained power may fire first |
| Water and high power both sustained | Both deadlines are tracked; whichever is due first opens the incident |
| Caregiver records a phone confirmation while `possible_away` | → `routine`. T1 then counts from the confirmation: "No water use since confirmed contact with …" |

---

## 5. Away periods (declared by the caregiver)

| Situation | What happens |
|---|---|
| Caregiver tries to add an away period (Stop Tracking) while an incident is open | Refused: "Record an outcome for the current alert before stopping tracking" |
| During an away period | T1, T2 and T3 are paused |
| Away period ends | The T1/T2/T3 clock restarts from the end time. If it fires: "Away period ended at HH:MM, then no activity at home for X. … may not be back yet." (U3) |
| Continuous water or sustained power during an away period | Keep running; they are not paused |
| Water starts, or she taps in or out, during an away period | Once per period, a caregiver notice: "Water used at HH:MM while … is marked away." or "Mum tapped in at Block A lift lobby at HH:MM while marked away." Electricity alone does **not** send this notice |
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

| Incident type | New water / power activity |
|---|---|
| Quiet gap, outing, not back yet, tapped in with no activity, after-away | **Auto-resolves**: "Resolved: … detected during grace period / during the check". Silent if still in grace; notifies both sides if they had already been alerted |
| Continuous water, sustained power | **Does not resolve**: a meter cannot show the resident is safe |
| Home check (away period) | **Does not resolve**: activity is the concern here |
| Responder recorded "unable to verify" or "called 999" | **Does not resolve** |

A **card tap never resolves or changes an open incident**: a tap is not proof
she is safe. It is recorded, and the guard sees it on the incident.

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
| Water or electricity readings, or card taps | Latest values and taps are stored, but **status never changes** |
| T1 quiet gap, T2 outing, T3 tapped in | Paused |
| Continuous water, sustained power | **Keep running** |
| Away-activity notice, morning reassurance | Not sent |
| An away period expires, or sensor activity is seen | Does **not** clear hospital state |
| Designated caregiver confirms the resident is home (Return Home) | → `routine`, `care_state = home_monitoring`, any active away period ends, the quiet-gap clock restarts from the confirmation. Refused while an incident is open |

---

## 8. Other notifications

- **Morning reassurance**: the first activity of the day (no incident open, not away) sends the
  caregiver one message, for example "…'s day has started. Water used at home."

---

## 9. Who sees a card tap

- **Guard dashboard:** the last tap (place, in or out, time) only while an incident is open for
  that unit. On a normal day the guard sees only the status.
- **Caregiver app:** times only ("Mum tapped out at 10:12"), never which gate.

## Behaviours worth knowing

- Electricity use does not reset the quiet-gap timer; only water does.
- Electricity used during an away period sends no caregiver notice.
- Power counts as activity just above standby, but the high-power alarm needs standby + 1 kW.
- Only the caregiver's Return Home confirmation ends hospital state; sensor activity cannot.
- A card tap is never activity at home and never proof of safety. Only water or
  electricity shows she is in the flat.
