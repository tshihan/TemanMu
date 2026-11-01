# Caregiver App: Activity History

This note explains the new **History** feature in the caregiver app: what it does, where to find it and what to keep in mind when demoing it.

It covers only the Activity History feature from [phase2.md](../phase2.md) (section 5). The other Phase 2 features (access cards, away-mode improvements, machine learning, township reports) are **not** included.

## Why we added it

Before this, the caregiver app only showed **today**. Once a day ended, the activity was gone, and past alerts disappeared from Home after the status changed.

History lets a caregiver look back over the past week or month and answer questions like:

- "Is Mum's routine changing?" (for example, her first water use is getting later)
- "What happened with that alert on Tuesday?"
- "Why was Wednesday so quiet?" (because monitoring was paused)

## Where to find it

1. Open the caregiver app.
2. On the **Home** tab, find the **Mum's day** card.
3. Tap **Past 7 days** at the bottom of that card.

We didn't add a new tab. History is something caregivers check occasionally, not every day, so it sits one tap away from today's timeline.

## What it shows

### The overview

- A switch between **7 days** and **30 days**.
- **One row per day**, from midnight to midnight, with three lanes:
  - **Water** (blue): hours when water was used
  - **Power** (yellow): hours when electricity use was above the home's normal standby level
  - **Door** (green ticks): when the front door opened
- Shaded bands on top of the lanes:
  - **Paused** (green band): monitoring was paused, e.g. Mum was away
  - **No data** (striped): no information for that time
  - **Alert** (red line): an alert started at that time
- The 30-day view uses slimmer rows grouped by week.

### Tapping a day

Opens that day's detail:

- **A short summary** in plain facts, e.g. *"First water use recorded at 6:05 AM. Door opened at 6:52 AM and 8:27 AM."*
- **Two bar charts**, one for water (litres per hour) and one for electricity (kWh per hour). They are kept separate because they're measured in different units.
- **Tap any bar** to see that hour's exact values.
- **Alerts** on that day are listed as buttons. Tapping one opens the existing alert screen with the full timeline and outcome.
- **Show as table** lists every hour's values in a table.

## Important: we only state facts

The app never says things like *"Mum slept well"* or *"Mum is healthy"*. The sensors can't know that: running water could be a visitor or a leaking tap.

So every summary only says what was **recorded**:

| ✅ We say | ❌ We don't say |
| --- | --- |
| "First water use recorded at 7:20 AM" | "Mum woke up at 7:20 AM" |
| "Door opened at 10:15 AM" | "Mum went out" |
| "Monitoring paused 9:30 AM–7:00 PM" | "Mum was at her daughter's house" |

Each day's detail screen ends with a reminder: *"TemanMu can't tell who used them or how Mum is feeling."*

## Where the data comes from (please read before demoing)

We don't have weeks of real meter data, so History mixes two kinds of days:

| Day type | Label | Where it comes from |
| --- | --- | --- |
| Days **before** the last Reset Demo | **Simulated** | Made up for the demo, based on Mum's usual routine (wakes around 6 AM, goes out around 7–8 AM) |
| Days **from** the last Reset Demo onwards | **Live** | Real activity from the simulator, plus real alerts and away periods |

Things to know:

- **Simulated days are clearly labelled** "Simulated" on every row and on the detail screen. Please don't present them as real measurements.
- **Simulated days are the same every time** you open History, so the demo is predictable.
- **Simulated days never trigger alerts.** They exist only on the History screen.
- **Today shows "No data before the demo started"** for the time before you pressed Reset Demo. This is expected and matches what the "Mum's day" card on Home shows.
- Some simulated days have built-in examples, so there's always something to point at:
  - **4 days ago:** monitoring paused 9:30 AM–7:00 PM
  - **2 days ago:** no meter data 1:00–4:00 AM
  - **30-day view:** an overnight stay away, and another gap in the data
- We have no access cards yet, so outings are shown using the **door sensor**.

## Suggested demo flow

1. Press **Reset Demo**.
2. In the caregiver app, tap **Past 7 days**. Point out the daily pattern, the **Paused** band on Wednesday-style days and the **No data** stripes.
3. Tap a simulated day to show the hourly charts. Tap a bar to show the exact value.
4. Run a scenario in the simulator (e.g. inactivity) so an alert happens.
5. Go back to History. **Today** now shows the live activity and a red alert marker. Tap today, then tap the alert to open its details.

## Setting it up on your machine

If you run the real backend (not the mock), you need to do this once:

1. From the `backend` folder, run: `python -m app.db.migrate` (adds one small table that remembers when the demo was last reset)
2. Restart the backend.
3. Press **Reset Demo** once.

If you run the frontend in mock mode, no setup is needed.

## Not done yet

- **"Usual pattern" comparison** (shading what a normal day looks like) is planned for later, once we have enough history to compare against. This is in line with the delivery order in phase2.md.
- **Access-card events**: History will show them once that Phase 2 feature exists.
- **Colours**: History reuses the app's existing water/power/door colours so it matches Home. The yellow is a little hard to see on white, and green and yellow are close in dark mode. Tap-to-see values and the table view cover this for now, but the colours could be improved.
