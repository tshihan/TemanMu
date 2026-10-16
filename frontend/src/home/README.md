# Unit A-105 — interactive home, scenarios and sensor bridge

A furnished 3D home built with React, Three.js, React Three Fiber and Drei. The main app mounts `HomeEnvironment` in a separate Presenter Simulator tab. The Township and Caregiver dashboards stay in the product tab.

## Run

From `frontend`, run `npm install` and `npm run dev`. Open the local URL printed by Vite (normally http://localhost:5173; Vite chooses another port if it is occupied), then choose **Presenter simulator ↗**. Keep the product dashboard open in the first tab.

- Drag with the left mouse button to orbit; scroll to zoom.
- Use the camera toolbar or focus the canvas and use Left/Right, +/− and Home.
- **Top view** shows the floor plan; **Reset camera** restores the full dollhouse view.
- Camera easing respects the browser's reduced-motion preference.
- Choose **Normal Morning**, **Going Out**, **Unusual Inactivity** or **False Alarm Recovery** in **3D Scenarios**. The panel shows the current action and step. Pause/resume, stop, or reset the demo at any point.
- Set the outdoor interval before Going Out. False Alarm Recovery waits for an `incident.updated` grace event. Mock mode triggers simulated quiet-gap detection after the 3D collapse; live mode waits for the backend.
- Expand the manual movement panel to move Madam Lee to the named locations or reset her beside the bed.
- Hover over and click the bathroom tap, kitchen kettle, entrance door or living-room telephone. The collapsible **Interaction Test** panel offers the same actions and an incoming-call test. Manual controls are disabled during scenario playback.
- The meter inside the viewer shows current confirmed A-105 water, electricity and door values. A five-entry recent-reading list keeps short ON/OFF changes visible after the values return to baseline. The panel also shows the last reading time, connection state and transmission result. **Reset Demo** asks for confirmation and calls the shared API reset endpoint.
- On desktop, the interaction controls, scenarios and sensor meter sit in a scrollable right sidebar beside the 3D home. On narrower windows they stack below the scene so the controls remain readable.

## Component boundary

```tsx
import { HomeEnvironment } from './home/HomeEnvironment'

<div style={{ display: 'flex', height: '100%', minHeight: 360 }}>
  <HomeEnvironment />
</div>
```

The viewer fills its parent and uses the app's existing API and shared event store. It only reads A-105 data, posts household sensor readings and responds to relevant events. In mock mode, the API lives in a SharedWorker so both tabs observe the same session. In live mode, both tabs use the backend REST/WebSocket endpoints. `HouseModel` is also exported separately for embedding inside a future R3F Canvas.

## Scene structure

- `HomeEnvironment.tsx`: Canvas, lighting, camera, controls, error fallback; exports `HouseModel`.
- `Architecture.tsx`: foundation, cutaway walls, windows, thresholds and entrance.
- `rooms/`: independent Bedroom, Bathroom, Kitchen, LivingRoom and DiningArea components.
- `primitives.tsx`: rounded geometry, plants, lamps, books and artwork.
- `materials.ts`: shared materials and seeded canvas textures for wood, fabric and tiles.
- `home.css`: scoped viewer controls; the main app provides the surrounding presenter page.
- `character/ElderlyCharacter.tsx`: licensed rigged avatar loading, idle/walk blending, turning, delta-time movement and animation cleanup.
- `character/navigation.ts`: waypoint graph fitted to the existing walls and furniture; shortest connected route between named rooms.
- `interactions/registry.ts`: typed target positions, labels and local object states.
- `interactions/InteractiveObject.tsx`: shared 3D hit target, pointer feedback and tooltip.
- `scenarios/definitions.ts`: four scripted step sequences and adjustable intervals.
- `scenarios/ScenarioController.ts`: pause-aware playback, cancellation and step progression.
- `integration/sensorGateway.ts`: validated, serialized and deduplicated A-105 sensor writes.

One world unit represents one metre. Y is up, negative Z is the rear, positive X is the right side of the reference plan. The main occupied footprint is approximately 11 × 10 m, with a stepped kitchen extension and entrance porch. Walls facing the default camera are cut down for visibility; doorways remain open. The entrance door starts closed and rotates outward around its existing hinge.

The tap, kettle, door and telephone retain their scene names and existing room locations. Clicking one sends an object target through the same waypoint controller as the room buttons. Madam Lee reaches a dedicated safe approach point, faces the object and makes a short arm gesture. Sensor objects then send the changed value through the shared API; their visual state and meter use the confirmed response or a backend event. The tap has a short water stream, the kettle subtle steam, and the door smooth hinge rotation. A delivered companion message rings the phone, lifts its receiver and displays the event's text; the phone sends no sensor reading. Calls received while a scenario is running are queued until Madam Lee is available. Stopping a scenario preserves confirmed sensor values; resetting both the scene and backend requires **Reset Demo**.

Madam Lee begins standing beside the bed. The waypoint graph uses clear aisles through the two private-room thresholds, around the refrigerator and dining chairs, then to the living room and entrance. A new destination selected mid-walk takes effect after the current safe waypoint. Reset Character returns her immediately to the bedroom. The graph also includes bedside, floor-collapse, threshold, porch and outside waypoints for scenarios. It is isolated from dashboard data and can be extended with new destinations later.

Normal Morning shows bed rest, waking, bathroom tap use and kettle use. Going Out opens the entrance, moves Madam Lee outside for the chosen interval, then brings her home and closes the door. Every actual door transition sends `open` or `closed`; the simulator never assigns Possible Away. Unusual Inactivity shows a floor collapse and holds that pose without sending a reading. False Alarm Recovery waits for the backend's grace incident, gets up, uses the tap and checks for a real `auto_resolved` event with water activity recorded before the grace deadline. Its recovery walk is faster for the demo; a grace period shorter than the actual route may still expire, which is reported as an error. Scenarios call the same sensor sender as manual interactions. Reset cancels queued actions, calls `POST /api/demo/reset` and restores the scene only after confirmation. Reconnect snapshots refresh sensor values without restarting character animation.

## Rendering

The house geometry and textures are created locally. Madam Lee uses Microsoft's [Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) `Female_Adult_03` FBX rig with its neutral idle and slow-walk clips, stored under `public/models/madam-lee/`; the [MIT license](../../public/models/madam-lee/LICENSE.md) is bundled. Her head and hair-card colour maps were adapted into silver-haired, mature variants; the original UV textures remain alongside them. `FBXLoader` maps source TGA references to the bundled WebP files. The source FBX's zero diffuse colour is corrected at load time, and horizontal root motion is removed from the clips so the path controller owns her position. She is scaled from centimetres to about 1.65 m and animates on the same Canvas as the house. No remote asset requests are needed.

Mesh materials and basic geometry are shared, the pixel ratio is capped at 1.7, shadows use one 2048px directional map plus a one-shot contact pass, and frames render on demand. A locally generated room environment supplies metal/glass reflections. Once the avatar loads, the animation loop requests frames for her breathing and gait.

The dashboard shell loads first, followed by the lazy-loaded 3D viewer. Vite reports a large-chunk advisory for the 3D engine. The renderer emits one upstream `THREE.Clock` deprecation warning; it does not prevent rendering. No runtime errors were observed in the production browser checks.

## Verification

For Mission 5, `npm run build`, `npm run lint`, `git diff --check`, the navigation test and `sensorGateway.test.mjs` passed. Mock browser checks covered Normal Morning's confirmed water/electricity sequence, Going Out's door sequence, pause/resume, a manual tap, a delivered companion message using the supplied text, reset clearing mock readings, a cross-panel snapshot reset during movement, and a failed write leaving the meter unchanged. The two-tab presentation layout was later checked with a tap reading from the simulator appearing in A-105's water timeline and caregiver badge in an already-open dashboard tab, and in a newly opened dashboard tab. The mock now starts simulated quiet-gap detection after a 3D collapse; live mode still depends on backend events. The live FastAPI service was not running; `backend/app/main.py` still has placeholders for `POST /api/readings` and `/ws`, while `backend/app/realtime/broadcast.py` is a stub. Live ingestion, outage/reconnection recovery, real inactivity/auto-resolution, and door outing interpretation remain unverified. This frontend does not implement live backend monitoring rules.

The development server's file watcher missed edits in the build environment, so final browser verification used a fresh production build (`npm run build && npm run preview`). Restart Vite if a local development view appears stale. The mission does not require or exercise a running backend.
