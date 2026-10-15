# Unit A-105 — furnished home and Madam Lee

A furnished 3D home built with React, Three.js, React Three Fiber and Drei. The main app mounts `HomeEnvironment` in its left panel, alongside the existing Township and Caregiver dashboards.

## Run

From `frontend`, run `npm install` and `npm run dev`. Open the local URL printed by Vite (normally http://localhost:5173; Vite chooses another port if it is occupied).

- Drag with the left mouse button to orbit; scroll to zoom.
- Use the camera toolbar or focus the canvas and use Left/Right, +/− and Home.
- **Top view** shows the floor plan; **Reset camera** restores the full dollhouse view.
- Camera easing respects the browser's reduced-motion preference.
- The compact panel below the scene moves Madam Lee to the six named locations or resets her beside the bed. These are temporary Mission 2 development controls.

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

One world unit represents one metre. Y is up, negative Z is the rear, positive X is the right side of the reference plan. The main occupied footprint is approximately 11 × 10 m, with a stepped kitchen extension and entrance porch. Walls facing the default camera are cut down for visibility; doorways remain open. The entrance is a static, partly open door.

Identifiable future interaction groups: `bathroom-tap`, `electric-kettle`, `main-door`, `telephone`, `double-bed`. Rooms and furniture also have descriptive scene names. These are static visual models; character movement does not activate them or send sensor readings.

Madam Lee begins standing beside the bed. The waypoint graph uses clear aisles through the two private-room thresholds, around the refrigerator and dining chairs, then to the living room and open entrance. A new destination selected mid-walk takes effect after the current safe waypoint. Reset returns her immediately to the bedroom. The graph is isolated from dashboard data and can be extended with new destinations later.

## Rendering

The house geometry and textures are created locally. Madam Lee uses Microsoft's [Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) `Female_Adult_03` FBX rig with its neutral idle and slow-walk clips, stored under `public/models/madam-lee/`; the [MIT license](../../public/models/madam-lee/LICENSE.md) is bundled. Her head and hair-card colour maps were adapted into silver-haired, mature variants; the original UV textures remain alongside them. `FBXLoader` maps source TGA references to the bundled WebP files. The source FBX's zero diffuse colour is corrected at load time, and horizontal root motion is removed from the clips so the path controller owns her position. She is scaled from centimetres to about 1.65 m and animates on the same Canvas as the house. No remote asset requests are needed.

Mesh materials and basic geometry are shared, the pixel ratio is capped at 1.7, shadows use one 2048px directional map plus a one-shot contact pass, and frames render on demand. A locally generated room environment supplies metal/glass reflections. Once the avatar loads, the animation loop requests frames for her breathing and gait.

The dashboard shell loads first, followed by the lazy-loaded 3D viewer. Vite reports a large-chunk advisory for the 3D engine. The renderer emits one upstream `THREE.Clock` deprecation warning; it does not prevent rendering. No runtime errors were observed in the production browser checks.

## Verification

`npm run build`, `npm run lint`, `git diff --check`, and `node --experimental-strip-types --test src/home/character/navigation.test.mjs` pass. The navigation test samples every pair of named destinations against the house's solid walls and furniture with an 18 cm avatar clearance. Production browser checks covered kitchen arrival, mid-walk retargeting to bathroom, camera zoom/rotation/reset during movement, and character reset. Mission 1 browser evidence is under `frontend/output/playwright/integrated-*.png`. The scene itself does not request remote assets. The surrounding dashboard continues to use its existing mock or live API client.

The development server's file watcher missed edits in the build environment, so final browser verification used a fresh production build (`npm run build && npm run preview`). Restart Vite if a local development view appears stale. The mission does not require or exercise a running backend.
