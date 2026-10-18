# Bug: Live 3D scenario hangs when the incident is handled early on Unit status

**Where:** Live 3D view (`#simulator`), scenario **Unusual Inactivity** (the same pattern can affect **False Alarm Recovery**)
**Mode:** Mock data (`VITE_USE_MOCK` not `false`)
**Severity:** Demo-breaking. The scenario gets stuck mid-run with no error, and the 3D view no longer matches the incident.

## What you see

The player bar stays on step 6, *"No answer; waiting for caregiver and township alert"*, indefinitely. Meanwhile Unit status already shows the incident as **Resolved** ("Outcome: Resident OK · Checked by Guard Ali").

The incident timeline has no `notified` event:

```
detected · Water quiet gap exceeded
voice call started · Calling Mum (simulated)
voice call no answer · No answer (simulated)
acknowledged · Guard Ali        ← before any "notified" event
closed · Guard Ali
```

## How to reproduce

1. Run the frontend in mock mode (`npm run dev` in `frontend/`).
2. Open `#simulator` in one tab and `#dashboard` (Unit status) in a second tab.
3. In `#simulator`, choose **Unusual Inactivity** and press **Play**.
4. Wait until the caption reaches step 5 or 6 ("Simulated call to Mum…" / "No answer; waiting for caregiver and township alert"). The incident is now in its **grace period** (15 s in mock).
5. **Before the grace period ends**, open A-105 on Unit status and press **I'll Check Now**.
6. Optionally record an outcome (e.g. *Resident OK*) to close it.
7. Back in `#simulator`: the scenario never moves past step 6. Guard Ali never appears. Only **Stop** or **Reset demo** gets out of it.

## Why it happens

- `acknowledgeIncident` in `frontend/src/mocks/api.ts` accepts incidents in both `grace` and `notified`, and calls `clearScenarioTimers()`. Acknowledging during grace therefore cancels the timer that would have moved the incident to `notified`.
- Because the incident never reaches `notified`, no caregiver `alert` notification is ever created.
- Step 6 of the scenario (`alert` → `waitForCaregiverAlert` in `frontend/src/home/HomeEnvironment.tsx`) waits **only** for that caregiver `alert` notification. It has no exit when the incident is acknowledged, closed or auto-resolved, and no timeout. So it waits forever.
- `waitForNoAnswer` (step 5) has the same weakness: it only watches for a `voice_call_no_answer` event.

In short, the scenario script assumes the backend always follows the full path *grace → no answer → notified → acknowledged*. A human acting early on Unit status skips steps, and the script can't cope.

## Expected behaviour

When the incident moves ahead of the scenario (acknowledged, closed or auto-resolved), the scenario should stop waiting:

- **Acknowledged by the township during grace:** skip the remaining wait steps and continue to Guard Ali's visit.
- **Closed or auto-resolved:** end the scenario cleanly with a caption such as *"Resolved on Unit status"*, rather than hanging.

## Suggested fix (not implemented yet)

- Make every incident wait in the scenario (`waitForNoAnswer`, `waitForCaregiverAlert`, `dispatchResponder`) also resolve when the incident is `acknowledged`, `closed` or `auto_resolved`, and report which one happened.
- Let the scenario runner jump ahead based on that result (to the responder steps if acknowledged by the township, or finish if closed).
- Check the live backend: if it also allows acknowledging during grace, the same hang happens with `VITE_USE_MOCK=false`.
