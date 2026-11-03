# TemanMu Phase 2 Implementation Plan

## Purpose and scope

Phase 2 extends the current simulator-based TemanMu solution with access-card context, improved away management, a personal routine model, simple database incident records and caregiver activity history.

Source: the team brief in `SDP Hack.md`, including its two embedded activity-history screenshots. All five features are P0; the source table leaves activity history unassigned, so P0 follows the agreed team scope.

The simulator remains part of the solution and demonstration. Installing real meters is not required for this phase. The future deployment approach is documented in [TemanMu Retrofit Deployment Plan](TEMANMU_RETROFIT_DEPLOYMENT_PLAN.md).

Existing away-mode implementation notes are preserved in [Away-period implementation](docs/away-periods-implementation.md). Those notes describe earlier work and historical verification, not proof that the requirements below are complete.

## Feature summary

| Title | Description — Why and how to implement | Priority |
| --- | --- | --- |
| **Access Card Integration** | Use resident-linked entry and exit events to provide outing context and reduce additional door-sensor installation where township infrastructure supports integration. Cross-check events with water and electricity activity; a card swipe alone does not establish resident presence. | **P0** |
| **Caregiver App — Mum/Dad Is Away** | Extend existing away periods with return reminders, extension, shared pause visibility and a return-confirmation prompt when household activity occurs. Require an outcome for an existing unresolved alert before pausing. | **P0** |
| **Machine Learning — Personal Routine Model** | Evaluate Isolation Forest supported by time-of-day historical baselines, initially in shadow mode. Compare with existing rules before allowing model decisions to affect alerts. | **P0** |
| **Township Incident Record** | Save the original trigger, responder acceptance, outcome, short note and event timeline in the existing backend database. Add Live monitoring and Incident log tabs with summary statistics and read-only record details. Keep the current response flow; no visit recording or generated reports. | **P0** |
| **Caregiver Activity History — 7 / 30 Days** | Add daily activity timelines and selected-day charts, with access events, away periods, welfare-check markers and explicit missing-data labels. | **P0** |

## 1. Access-card context

### Behaviour

- Represent entry and exit as access events, not renamed door-open/closed readings.
- Associate each event with the relevant home and resident/card identity, direction, access point and timestamp.
- In the simulator, provide explicit entry/exit actions that exercise the same event contract intended for a future access-system adapter.
- Cross-check access events with household water and electricity activity before indicating **Likely away**.
- Account for shared cards, missed swipes, incomplete direction information and other people using the home. Do not label card events as confirmed resident safety or presence.
- Explain in the pitch that fewer installations are possible only where usable access-system integration exists.

### Completion criteria

- Simulated entry/exit events reach shared state and relevant timelines.
- Missing or ambiguous access records do not falsely establish an outing.
- Existing outing detection is reviewed explicitly rather than carrying door-sensor assumptions into card logic.

## 2. Caregiver away mode

### Existing foundation

The repository already supports scheduled away periods, optional caregiver-private reasons, caregiver/township away indicators and inactivity-clock handling. Review and extend these paths rather than building a second away system.

### Required behaviour

1. Let the caregiver enter an away start and expected return date/time, with an optional reason.
2. Show **Monitoring paused until [date/time]** in both caregiver and township views. Clarify that the pause applies to inactivity monitoring; retain existing sustained-water/high-power concern handling.
3. Notify the caregiver shortly before the expected return and offer an extension. The reminder lead time remains a configuration decision.
4. Automatically resume inactivity monitoring when the period ends, restarting its clock from the end time rather than counting the whole absence as inactivity.
5. If water or electricity activity occurs while away, prompt: **Activity detected at home. Has Mum/Dad returned?** Do not assume it belongs to the resident or automatically end the away period.
6. Let the caregiver confirm an early return and end the period, or leave it unchanged if the activity is expected from someone else.
7. Require a recorded outcome for an existing unresolved incident before permitting monitoring to be paused. A scheduled period must not silently suppress an unresolved incident when it begins.
8. Keep the optional reason private to the caregiver; township staff receive only the operational away dates/status.

### Completion criteria

- Reminder, extension, early return and automatic resumption work consistently across caregiver and township views.
- Reminders are not duplicated after refresh or reconnect; an extension updates the applicable deadline.
- An activity prompt cannot close an incident or establish that the resident is safe.
- Behaviour is checked in mock and backend-connected modes, with any remaining differences documented.

## 3. Personal routine model

### Proposed method

Evaluate **Isolation Forest supported by time-of-day historical baselines** as the first candidate. Its role is to identify unusual household behaviour, not diagnose a fall or determine a medical condition.

Candidate features:

- Time since last water activity.
- Recent water activity relative to historical usage at the same time of day.
- Electricity usage relative to the household's usual usage for that time.
- Recent access entry/exit events and elapsed time.
- Time of day and day of week.

### Implementation

- Generate reproducible, clearly labelled simulated history for the prototype; do not present it as measured resident data.
- Check data completeness before scoring. Missing data must remain missing, rather than becoming zero consumption.
- Calculate baselines from prior valid history, excluding scheduled absences and missing-data periods. Show an insufficient-history state where appropriate.
- Keep training, validation and test periods separate, with past-only features and threshold decisions made without test-set tuning.
- Start in **shadow mode**: record model scores and proposed decisions without sending additional alerts or changing existing escalation.
- Retain explicit check-in and human-response rules.
- Compare the candidate with existing rules using missed episodes, false alerts per home over a stated period, and detection delay. Include sleep, outings, routine changes and feed interruptions in evaluation.

### Completion criteria

- Results are reproducible and identify the dataset, feature definitions and model configuration.
- The team can explain what the model uses, what its output means and where it fails.
- No claim of improved detection or real-world reliability is made without supporting evaluation.

## 4. Township incident record

### Agreed scope

Keep the current operator flow: accept the alert, select an outcome, optionally add a short note, and submit. Store the record in the backend database using the existing `incidents` and `incident_events` tables. Add a left navigation sidebar with **Live monitoring** (default) and **Incident log**. No arrival/visit action, document generation, separate report tables or follow-up workflow is required.

### Incident-log interface

- Preserve live floor/unit selection and filters across tab changes. On narrow screens, show the navigation as a compact row.
- Show finished (`closed` and `auto_resolved`) incidents only, newest completion first, with **7 days / 30 days / All** filters and 20 records per page. Calendar windows include today in Asia/Kuala_Lumpur time. Use the saved closing timestamp, falling back to a closing/automatic-resolution event; undated records appear only under All as **Not recorded**.
- Display large counts for **Finished incidents**, **Township help requested** (unique finished incidents with a recorded `notified` event), and **Enrolled residents** (current actual resident records, including away/hospital; exclude illustrative units). Only the first two counts follow the period filter.
- Show completion date/time, unit/resident, original trigger, responder, outcome and **View details**. A read-only drawer shows the incident ID, original trigger, opened/completed times, acceptance, outcome, saved note and chronological timeline. Missing fields say **Not recorded**. Automatic resolution is not confirmation of safety.
- Keep sounds, reminders and a prominent response-needed banner active while the log is open. **Open live monitoring** returns to the existing response workflow without automatically switching tabs.
- Reuse the existing shared snapshot and incident updates. Label mock records as simulated, retain honest empty states and show a stale-data notice on disconnection. Reset Demo clears mock history.

| Field | Saved information |
| --- | --- |
| Incident | Incident ID, home/unit, opened time and current state. |
| Trigger | Original explanation captured when the incident opens, plus the detected event. |
| Acceptance | Responder role, name and acceptance timestamp. This is not a visit or arrival timestamp. |
| Outcome | The selected outcome, including resident okay, assistance provided, sent to hospital and home-check outcomes. |
| Note | The existing short report field. The current quick form uses the selected outcome label when the optional note is blank. |
| Completion | Closing timestamp and the actor recorded on the closed event. |
| Timeline | Detection, simulated-call steps, notification-stage events, reminders, acceptance, caregiver responses, escalation and closure, as applicable. Notification-stage events do not prove external delivery. |

### Implementation and completion criteria

- Persist each existing action as it happens, retaining unfinished incidents too.
- Capture `trigger_reason` on the incident so later home-status changes cannot replace the original explanation. Historical records without the full explanation retain null; their existing detected events remain available.
- Save outcome, note, closing event and related home-state changes in the existing database transaction. Preserve row-lock/state checks that reject repeated acceptance or closure.
- Reload records through the existing snapshot and incident endpoints; the incident log needs no new API or database schema.
- Keep false-alarm outcomes and automatically resolved episodes in history. Automatic activity recovery is not a completed human visit or confirmation of safety.
- Keep human-recorded emergency calls distinct from dispatch confirmation. No LLM or external API key is needed.
- Verify that records survive closing and reopening the database connection pool. Mock-mode history is demonstration state, not persistent database storage; Reset Demo deliberately clears incident history.

## 5. Caregiver activity history

### Daily activity overview

- Add **7 days / 30 days** filters.
- Use one row per day, running from midnight to midnight, with water, electricity activity above standby and access-card events.
- For seven days, show all seven daily rows. For thirty days, use a compact overview with week/day selection.
- Use separate symbols or lanes as well as colour.
- Mark scheduled away periods and missing data clearly.

### Selected-day detail

Tapping a day opens aligned charts and event markers:

| Element | Display | Purpose |
| --- | --- | --- |
| Water | Hourly consumption in litres. | Shows when household water use occurred. |
| Electricity | Hourly consumption in kWh. | Shows changes in household electricity use. |
| Access card | Recorded entry/exit markers below the charts. | Provides possible outing context. |
| Usual pattern | Optional shaded historical range for that time of day. | Compares the selected day with prior valid history. |
| Away periods and welfare checks | Labelled intervals and selectable event markers. | Explains quiet periods and links to incident timelines/outcomes. |

Keep water and electricity in separate aligned charts because their units differ. Support tap-to-view timestamps and values, with large touch targets. A chart library such as Recharts is an implementation option, not a fixed dependency requirement.

Use factual summaries such as:

> First water activity recorded at 7:20 am. Access exit recorded at 10:15 am. Monitoring paused until 6 pm.

Do not infer that Mum/Dad is healthy or slept well from household signals.

### Data preparation

1. Store timestamped readings/access events, including occurrence time, receipt time and feed availability.
2. Prepare hourly water/electricity consumption summaries on the backend for the selected period.
3. Provide clearly labelled simulated historical readings for the demo. Current simulator state changes alone are not a continuous meter history.
4. Calculate consumption using cumulative differences or integration over known valid intervals; do not add power readings as if they were energy.
5. Exclude invalid/away periods from historical comparisons and show **Not enough history yet** where needed.
6. Link welfare-check markers to the existing incident timeline and recorded outcome.

### Delivery order within this feature

First deliver filters, daily activity rows, selected-day charts and away/missing-data labels. Add historical routine comparisons once sufficient valid simulated history and baseline calculations are available.

## Suggested implementation sequence

All features remain P0. This sequence reflects dependencies rather than a change in priority:

1. Define access-event and historical-reading contracts, timestamps and data-quality states.
2. Extend the simulator and backend history endpoints with reproducible sample history.
3. Complete away-mode reminders, extension and incident safeguards.
4. Build caregiver history views and verify simple township incident persistence.
5. Train and evaluate the routine-model candidate in shadow mode using the agreed history contract.

## Review and demonstration boundaries

- This document specifies planned work; it does not certify completion.
- Demonstrate the same scenarios in mock and backend-connected modes where supported, and label differences.
- Keep simulated data, algorithm evaluation and real deployment evidence distinct.
- Hardware installation and utility/access-provider agreements belong to future deployment work; see the linked retrofit plan.
