import test from 'node:test'
import assert from 'node:assert/strict'
import { ROOM_LABELS, WAYPOINTS, routeBetween } from './navigation.ts'
import { INTERACTIONS } from '../interactions/registry.ts'

// Footprint of solid furniture and room dividers in the Mission 1 house.
// Test the centre of a 36 cm wide walking envelope every 2 cm along each route.
const obstacles = [
  [-3.92, -1.71, -4.68, -1.82], // bed
  [-.54, -.36, -5, -2.1], // bedroom / bathroom divider
  [-5.5, -1.45, -1.09, -.91], [-.45, .75, -1.09, -.91], [2.3, 4.1, -1.09, -.91],
  [-.22, .92, -4.15, -3.37], [1.44, 2.06, -4.25, -3.32], [2.37, 3.92, -4.73, -2.17],
  [2.92, 3.79, -.9, .52], [3.82, 5.29, -.9, -.07], [4.62, 5.44, -.1, 2.7],
  [-4.46, -1.74, .22, 1.28], [-3.77, -2.39, 1.86, 3.24], // sofa and coffee table
  [.5, 1.8, .34, 2.36], [.85, 1.45, -.38, .27], [.85, 1.45, 2.42, 3.1],
  [-.14, .46, 1.05, 1.65], [1.84, 2.44, 1.05, 1.65], // dining table and chairs
  [-.975, .275, 4.29, 4.75], // entry bench
  [-5.095, -4.345, 3.725, 4.375], // telephone side table
]

test('all room and object approach pairs have clear, connected walking routes', () => {
  const destinations = [...Object.keys(ROOM_LABELS), ...Object.values(INTERACTIONS).map(value => value.approach),
    'bedside', 'collapseSpot', 'doorThreshold', 'porch', 'outside']
  for (const from of destinations) {
    for (const to of destinations) {
      const route = routeBetween(from, to)
      assert.equal(route.at(-1) ?? from, to)
      let previous = from
      for (const next of route) {
        const [x0, z0] = WAYPOINTS[previous]
        const [x1, z1] = WAYPOINTS[next]
        const count = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / .02)
        for (let index = 0; index <= count; index++) {
          const portion = index / count
          const x = x0 + (x1 - x0) * portion
          const z = z0 + (z1 - z0) * portion
          for (const [minX, maxX, minZ, maxZ] of obstacles) {
            assert.ok(x <= minX - .18 || x >= maxX + .18 || z <= minZ - .18 || z >= maxZ + .18,
              `${from} -> ${to}: ${previous} -> ${next} cuts an obstacle at ${x.toFixed(2)}, ${z.toFixed(2)}`)
          }
        }
        previous = next
      }
    }
  }
})
