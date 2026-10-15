# Unit A-105 — furnished, interactive home and scenarios

A furnished 3D home built with React, Three.js, React Three Fiber and Drei. The main app mounts `HomeEnvironment` in its left panel, alongside the existing Township and Caregiver dashboards.

## Run

From `frontend`, run `npm install` and `npm run dev`. Open the local URL printed by Vite (normally http://localhost:5173; Vite chooses another port if it is occupied).

- Drag with the left mouse button to orbit; scroll to zoom.
- Use the camera toolbar or focus the canvas and use Left/Right, +/− and Home.
- **Top view** shows the floor plan; **Reset camera** restores the full dollhouse view.
- Camera easing respects the browser's reduced-motion preference.
- Choose **Normal Morning**, **Going Out**, **Unusual Inactivity** or **False Alarm Recovery** in **3D Scenarios**. The panel shows the current action and step. Pause/resume, stop, or reset the demo at any point.
- Set the outdoor and recovery intervals before starting a scenario. They control how long Madam Lee stays outside in Going Out and how long she lies on the floor in False Alarm Recovery.
- Expand the manual movement panel to move Madam Lee to the named locations or reset her beside the bed.
- Hover over and click the bathroom tap, kitchen kettle, entrance door or living-room telephone. The collapsible **Interaction Test** panel offers the same actions, an incoming-call test and a reset. Manual controls are disabled during scenario playback.

## Component boundary

```tsx
import { HomeEnvironment } from './home/HomeEnvironment'

<div style={{ display: 'flex', height: '100%', minHeight: 360 }}>
  <HomeEnvironment />
</div>
```

The viewer fills its parent and has no API, dashboard, mock-store or backend dependency. The parent app owns the existing demo controls, meter strip and dashboard. `HouseModel` is also exported separately for embedding inside a future R3F Canvas.

## Scene structure

- `HomeEnvironment.tsx`: Canvas, lighting, camera, controls, error fallback; exports `HouseModel`.
- `Architecture.tsx`: foundation, cutaway walls, windows, thresholds and entrance.
- `rooms/`: independent Bedroom, Bathroom, Kitchen, LivingRoom and DiningArea components.
- `primitives.tsx`: rounded geometry, plants, lamps, books and artwork.
- `materials.ts`: shared materials and seeded canvas textures for wood, fabric and tiles.
- `home.css`: scoped viewer controls; the main app provides the surrounding split screen.
- `character/ElderlyCharacter.tsx`: licensed rigged avatar loading, idle/walk blending, turning, delta-time movement and animation cleanup.
- `character/navigation.ts`: waypoint graph fitted to the existing walls and furniture; shortest connected route between named rooms.
- `interactions/registry.ts`: typed target positions, labels and local object states.
- `interactions/InteractiveObject.tsx`: shared 3D hit target, pointer feedback and tooltip.
- `scenarios/definitions.ts`: four scripted step sequences and adjustable intervals.
- `scenarios/ScenarioController.ts`: pause-aware playback, cancellation and step progression.

One world unit represents one metre. Y is up, negative Z is the rear, positive X is the right side of the reference plan. The main occupied footprint is approximately 11 × 10 m, with a stepped kitchen extension and entrance porch. Walls facing the default camera are cut down for visibility; doorways remain open. The entrance door starts closed and rotates outward around its existing hinge.

The tap, kettle, door and telephone retain their scene names and existing room locations. Clicking one sends an object target through the same waypoint controller as the room buttons. Madam Lee reaches a dedicated safe approach point, faces the object, makes a short arm gesture, and only then changes its local visual state. The tap has a short water stream, the kettle subtle steam, and the door smooth hinge rotation. An incoming call rings the existing phone, lifts its receiver toward Madam Lee, shows a speech bubble briefly, then returns to idle. Clicking another target cancels the current sequence and leaves the telephone consistent. Reset turns both appliances off, closes the door, clears the phone and stops the current action without teleporting Madam Lee.

Madam Lee begins standing beside the bed. The waypoint graph uses clear aisles through the two private-room thresholds, around the refrigerator and dining chairs, then to the living room and entrance. A new destination selected mid-walk takes effect after the current safe waypoint. Reset Character returns her immediately to the bedroom. The graph also includes bedside, floor-collapse, threshold, porch and outside waypoints for scenarios. It is isolated from dashboard data and can be extended with new destinations later.

Normal Morning shows bed rest, waking, bathroom tap use, kettle use and a return to the living room. Going Out opens the entrance, moves Madam Lee outside for the chosen interval, then brings her home and closes the door. Unusual Inactivity shows a floor collapse and holds that pose until stopped or reset. False Alarm Recovery shows a brief collapse, a timed wait, recovery and ordinary activity. Scenarios call the same movement and interaction actions as the manual controls; reset cancels pending movement, waits and object actions and returns the viewer to its starting state. These are visual demonstrations only: no readings, alerts or incident changes are sent to the dashboard.

## Rendering

The house geometry and textures are created locally. Madam Lee uses Microsoft's [Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) `Female_Adult_03` FBX rig with its neutral idle and slow-walk clips, stored under `public/models/madam-lee/`; the [MIT license](../../public/models/madam-lee/LICENSE.md) is bundled. Her head and hair-card colour maps were adapted into silver-haired, mature variants; the original UV textures remain alongside them. `FBXLoader` maps source TGA references to the bundled WebP files. The source FBX's zero diffuse colour is corrected at load time, and horizontal root motion is removed from the clips so the path controller owns her position. She is scaled from centimetres to about 1.65 m and animates on the same Canvas as the house. No remote asset requests are needed.

Mesh materials and basic geometry are shared, the pixel ratio is capped at 1.7, shadows use one 2048px directional map plus a one-shot contact pass, and frames render on demand. A locally generated room environment supplies metal/glass reflections. Once the avatar loads, the animation loop requests frames for her breathing and gait.

The dashboard shell loads first, followed by the lazy-loaded 3D viewer. Vite reports a large-chunk advisory for the 3D engine. The renderer emits one upstream `THREE.Clock` deprecation warning; it does not prevent rendering. No runtime errors were observed in the production browser checks.

## Verification

`npm run build`, `npm run lint`, `git diff --check`, and `node --experimental-strip-types --test src/home/character/navigation.test.mjs` pass. The navigation test samples room, object and scenario routes against the house's solid walls and furniture with an 18 cm avatar clearance. Production browser checks covered all four scenario endings, pausing movement and timed waits, stopping and resetting from intermediate poses, resumed playback, manual interaction after a scenario, and continued camera/dashboard operation. Mission 3 browser checks covered direct clicks on all four 3D props and their delayed state changes. The scene itself does not request remote assets. Object states are local React state and do not send sensor readings or alter the dashboard; backend wiring belongs to a later mission.

The development server's file watcher missed edits in the build environment, so final browser verification used a fresh production build (`npm run build && npm run preview`). Restart Vite if a local development view appears stale. The mission does not require or exercise a running backend.
