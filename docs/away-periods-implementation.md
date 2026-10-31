# Phase 2: "Away from home" periods

## What is it?

The caregiver can now tell TemanMu that their parent (e.g. Mum) **won't be at home** for a while, for any reason: a holiday, a hospital stay, a few nights with family.

Before this, if Mum went away for 3 days, TemanMu would see "no water used for a long time" and raise a **false alarm**. Now the caregiver marks those days as an away period, and TemanMu knows not to worry about the quiet house.

## Home-screen tracking control (31 October 2026)

The Home screen now has **Stop Tracking** above **Call Mum**. It opens a confirmation dialog with an expected return date/time in Malaysia time, defaulting to tomorrow. Confirming creates an immediate away period through the existing API. The status card and Mum’s day meter turn grayscale and display the paused state; the call button stays available. **Resume Tracking** asks for confirmation and ends the active period early. The chosen return time still resumes inactivity monitoring automatically through the existing away-period handling.

An unresolved incident blocks creating an away period in both mock and backend APIs. Existing incident cards retain their alert colours if a safety concern arises during a pause. Water and power safety handling remains active.

Verification for this change: frontend build and lint passed (existing warnings elsewhere); 56 backend rule tests passed, with 21 database tests skipped because no `TEST_DATABASE_URL` was configured, including the new unresolved-incident guard regression test. Browser checks in mock mode verified confirmation, mobile button order, grayscale styles and manual resumption. Backend-connected browser verification is pending. Other Phase 2 requirements, including return reminders, extension and the explicit activity-return question, remain outside this change.

## How the caregiver uses it

1. Open the caregiver app and go to **Settings**.
2. In the **Away from home** card, tap **Add away period**.
3. Optionally, type a reason or tap a quick choice: *Holiday*, *Hospital stay*, *Staying with family*. You can leave it blank.
4. Choose when it starts (**Starting now** is ticked by default) and when Mum is due back.
5. Tap **Save**.

The period then shows in the list:

- **Away now** (yellow) means it is happening right now. The **End now** button is for when Mum comes back early.
- An upcoming period shows its dates. The **Cancel** button removes it.

While Mum is away, the **Home** tab shows a yellow card saying **"Mum is away"**, with the reason and the return time.

## What changes while Mum is away

| Alert | During an away period |
|---|---|
| "No water used for too long" | **Paused.** The house is meant to be quiet. |
| "Out longer than usual" | **Paused.** Mum is meant to be out. |
| "Tap left running" / "power left on" | **Still on.** This is dangerous even when nobody is home. |
| Front door opens or water is used | The caregiver gets *"Front door opened at 15:42 while Mum is marked away."* and the **Home** tab asks *"Do you know who's there?"* with three choices: **Mum is back home** (ends the away period), **I know who it is** (only records the answer) or **Request a home check** (the guard gets a home check to take and close with an outcome, as with any alert). It is sent only **once per away period**, so it doesn't spam. |
| "Mum's day has started" morning message | **Not sent.** It would be wrong while she's away. |

## What happens when the away period ends

- The "no water" and "out too long" timers **start fresh from the end time**. They don't count the whole trip as silence, so there's no instant alarm the moment the period ends.
- If Mum still isn't back after her usual time, the normal alert happens, with the message: *"Away period ended at 18:00, then no activity at home for… Mum may not be back yet."*
- If the caregiver taps **End now** early, the timers start fresh from that moment.

## Rules the app enforces

- Only the caregiver listed for that home can add or end a period.
- The end time must be in the future and after the start time.
- A period can be at most **90 days** long.
- Two periods can't overlap. The app shows *"This overlaps another away period"*.
- A start time in the past is treated as "starting now".

## 3D simulator

While an away period is active, **Mum disappears from the 3D home**, because she isn't there.

- A yellow **"Away"** badge in the top-right says *"Caregiver marked Mum away until Tue, 3 Nov, 2:24 am"* (no reason).
- **Play is turned off**, because the scenarios are about Mum doing things at home.
- When the period ends, or the caregiver taps **End now**, Mum reappears and everything works again. **Reset demo** also clears away periods.

### Clicking objects while Mum is away (for the demo)

The objects stay clickable so you can show what happens in an empty home. Nobody walks over: the object just switches on or off, as if it was **left on before Mum left** or **someone came in**. A note under the play bar tells the presenter this.

| Object | What clicking it shows |
|---|---|
| Bathroom tap, shower | Water use. The first one while away sends the caregiver the gentle *"Water used… while Mum is marked away"* message. Leave it on for 45 seconds and the **"tap left running"** alert fires. |
| Kitchen kettle, TV, bedroom lamp | Electricity use. Leave the kettle on for 45 seconds and the **"power left on"** alert fires. (The TV and lamp use too little power to count as "high".) |
| Main door | The caregiver gets *"Front door opened… while Mum is marked away"*. |
| **Mobile phone** | **Locked.** Nobody is home to answer it, so it shows *"Mum is away"* and does nothing. A message the caregiver sends from the **Together** tab waits and rings once Mum is back. |

Each "while Mum is marked away" message is sent **once per away period**, so clicking the door again won't send another.

If the caregiver taps **Request a home check** and the guard takes it on the township dashboard (**I'll Check Now**), **Guard Ali walks in**: from outside to the porch, opens the door, walks to the dining area, closes the door and stands in the living room, labelled *"Guard Ali · Township · checking the home"*. He leaves once the outcome is recorded. Like the inactivity scenario, this is a reenactment, not a sensor event.

**Why the tap alert needs extra wiring:** normally the backend only runs its alert timers while a scenario is playing, so Mum's home never raises alerts by itself between scenarios. When you click an object while Mum is away, the simulator switches the timers on first and keeps them on until the away period ends. The "too quiet" alerts still don't fire, because the away period pauses them. Only "tap left running" and "power left on" can fire.

**Try it:**
1. In the caregiver app, add an away period (Settings → Away from home).
2. In the 3D simulator, click the **bathroom tap** to turn it on. Mum doesn't appear.
3. Wait about 45 seconds. The tap alert starts, exactly as it would if Mum were home. The caregiver and the township guard are alerted.
4. A person has to close the alert. Turning the tap off doesn't close it on its own.

> In mock mode (`npm run dev` without the backend), the "tap left running" alert isn't simulated at all, so step 3 only works with the real backend (`npm run dev:live`). The door and water messages work in both.

## Privacy: who can see the reason

The reason is **optional** and **private to the caregiver**. A reason like "Hospital stay" is personal, so the township guard never receives it.

| | Caregiver | Township guard |
|---|---|---|
| That Mum is away, and until when | Yes | Yes (needed so they don't worry about a quiet house) |
| The reason | Yes | **No.** It isn't sent to the township screen at all, not even hidden in the data. |

How it works: the unit data that goes to every screen only says *when* Mum is away. The reason is kept separately, and the app only hands it out when the **caregiver** asks for it. If the township asks, the answer is "not allowed".

> Note: this prototype has no login yet, so each screen simply says whether it is the caregiver or the township. Once real logins are added, this check should use the logged-in account.

## Township (guard) dashboard

A unit whose resident is away shows a small **"Away"** tag (no reason). Its quiet-time bar stays empty, so the guard isn't misled by a quiet house.

## What was changed in the code

**Backend**
- `backend/app/db/migrations/008_away_periods.sql`: new `away_periods` table, plus the new notification type `away_activity`.
- `backend/app/db/migrations/009_away_reason_optional.sql`: makes the reason optional.
- `backend/app/db/away_periods.py`: reads and writes away periods.
- `backend/app/rules/engine.py`: the rules now skip over away periods when working out when to check on Mum.
- `backend/app/rules/reasons.py`: the new message texts.
- `backend/app/services/monitoring.py`: adding and ending periods, the gentle "activity while away" message, and no morning message while away.
- `backend/app/api/units.py`: three new endpoints:
  - `GET /api/units/{unit_id}/away-periods?role=caregiver` to read periods **with** their reasons (caregiver only; township is refused)
  - `POST /api/units/{unit_id}/away-periods` to add one
  - `POST /api/units/{unit_id}/away-periods/{period_id}/cancel` to end one now (if it has started) or cancel it (if it hasn't)
- `backend/app/models.py`: each unit now includes `away_periods` (current and upcoming ones, dates only, no reason).
- `backend/app/services/reset.py`: **Reset Demo** also clears away periods.

**Frontend**
- `frontend/src/caregiver/AwayPeriods.tsx`: the new Settings card (list and form).
- `frontend/src/caregiver/useAwayReasons.ts`: fetches the private reasons for the caregiver app only.
- `frontend/src/caregiver/HomeTab.tsx`: the "Mum is away" status card.
- `frontend/src/caregiver/copy.ts`: the wording for the new notification.
- `frontend/src/dashboard/TownshipView.tsx`: the "Away" tag.
- `frontend/src/home/HomeEnvironment.tsx`: hides Mum in the 3D home while she is away, shows the "Away" badge, lets objects be switched without her, and turns the alert timers on when one is clicked.
- `frontend/src/home/rooms/MobilePhone.tsx`, `interactions/InteractiveObject.tsx`, `interactions/registry.ts`: lock only the phone while Mum is away, with the tooltip "Mum is away".
- `frontend/src/mocks/api.ts`: the same behaviour in demo (mock) mode, so it works without the backend too.

## Testing

- New rule tests in `backend/tests/test_rules.py` pass, and so do all the existing tests (**141 passed**).
- New database tests in `backend/tests/test_actions.py` cover adding, ending, validation, reason privacy, the optional reason and the "once per period" message. They need a test database (`TEST_DATABASE_URL`) and **have not been run yet**.
- Checked on the real backend: the reason never appears in the unit data, township gets "not allowed" when it asks for reasons, the caregiver gets them, and saving without a reason works.
- The frontend typecheck, lint and build all pass. The whole flow was clicked through in the browser in mock mode: add a period, see the Home card, get the door message once, end the period.

## Hospital transfers (31 October 2026)

Recording **Sent to hospital** closes the incident response and persists `units.care_state = in_hospital`. This care context is separate from the home alert status so later home safety incidents cannot erase it. The caregiver sees **Mum is in hospital**, with grayscale status/day cards and **Return Home** opening an in-app confirmation. Only the designated caregiver can clear it after confirming the resident is home; an unresolved home alert must have an outcome first. The return restarts the inactivity clock and ends an active scheduled absence. Sensor activity and an away period expiring never clear hospital context. Morning activity messages and inactivity/outing checks are suppressed; existing sustained-water/high-power handling remains enabled. Township shows an In hospital tag and no inactivity bar. The simulator hides the resident and blocks resident scenarios/home-phone interactions until return. Reset Demo restores the default care context.

Before starting a backend with this change, apply `012_hospital_care_state.sql` using the existing runner:

```bash
cd /Users/hjkhor/TemanMu/TemanMu/backend
.venv/bin/python -m app.db.migrate
```

The migration preserves the latest recorded hospital outcomes on existing units unless a later caregiver home confirmation exists. Mock-mode browser verification covered responder close-out, a subsequent water reading retaining hospital context, and caregiver return confirmation. Database integration verification requires a separate `TEST_DATABASE_URL`.
