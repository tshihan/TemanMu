/** Walkable centres in the existing Unit A-105 floor plan (metres, x/z). */
export const WAYPOINTS = {
  bedroom: [-1.22, -1.34],
  bedside: [-1.4, -3.28],
  bedroomDoor: [-1.22, -.65],
  northLane: [-1.2, .3],
  livingLane: [-1.24, 1.55],
  living: [-1.43, 2.88],
  dining: [-.52, 2.9],
  bathroomDoor: [1.48, -.67],
  bathroomInner: [1.48, -1.55],
  bathroom: [1.1, -2.42],
  kitchenDoor: [2.55, -.67],
  kitchenLane: [2.68, .77],
  kitchen: [3.55, 1.55],
  diningEast: [2.74, 2.83],
  frontLane: [1.85, 3.53],
  entryLane: [.75, 3.55],
  mainDoor: [1.48, 4.58],
  doorThreshold: [1.48, 5.28],
  porch: [1.48, 5.68],
  outside: [1.48, 6.08],
  collapseSpot: [-1.35, 3.4],
  responderCheck: [-.35, 2.85],
  tapApproach: [.35, -3.18],
  showerApproach: [2.15, -1.85],
  kettleApproach: [4.32, 2.08],
  tvApproach: [-4.35, 1.55],
  phoneApproach: [-2.13, 2.65],
} as const

export type Waypoint = keyof typeof WAYPOINTS
export type RoomId = 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'mainDoor'
export const ROOM_LABELS: Record<RoomId, string> = {
  bedroom: 'Bedroom', bathroom: 'Bathroom', kitchen: 'Kitchen',
  living: 'Living Room', dining: 'Dining Area', mainDoor: 'Main Door',
}

const EDGES: [Waypoint, Waypoint][] = [
  ['bedroom', 'bedroomDoor'], ['bedroomDoor', 'northLane'],
  ['bedroom', 'bedside'],
  ['bedroomDoor', 'bathroomDoor'], ['bathroomDoor', 'bathroomInner'],
  ['bathroomInner', 'bathroom'], ['bathroomDoor', 'kitchenDoor'],
  ['kitchenDoor', 'kitchenLane'], ['kitchenLane', 'kitchen'],
  ['kitchen', 'diningEast'], ['diningEast', 'frontLane'],
  ['frontLane', 'entryLane'], ['entryLane', 'mainDoor'],
  ['mainDoor', 'doorThreshold'], ['doorThreshold', 'porch'], ['porch', 'outside'],
  ['bathroom', 'tapApproach'], ['kitchen', 'kettleApproach'],
  ['bathroomInner', 'showerApproach'], ['livingLane', 'tvApproach'],
  ['living', 'phoneApproach'],
  ['northLane', 'livingLane'], ['livingLane', 'living'],
  ['living', 'dining'], ['dining', 'entryLane'],
  ['living', 'collapseSpot'],
  ['dining', 'responderCheck'],
]

/** Dijkstra keeps the authored clearances while choosing the shortest available route. */
export function routeBetween(from: Waypoint, to: Waypoint): Waypoint[] {
  if (from === to) return []
  const pending = new Set<Waypoint>(Object.keys(WAYPOINTS) as Waypoint[])
  const distance = new Map<Waypoint, number>([[from, 0]])
  const previous = new Map<Waypoint, Waypoint>()
  while (pending.size) {
    const current = [...pending].reduce<Waypoint | undefined>((best, point) =>
      best === undefined || (distance.get(point) ?? Infinity) < (distance.get(best) ?? Infinity) ? point : best, undefined)
    if (!current || distance.get(current) === undefined) break
    if (current === to) break
    pending.delete(current)
    for (const [a, b] of EDGES) {
      const neighbor = a === current ? b : b === current ? a : undefined
      if (!neighbor || !pending.has(neighbor)) continue
      const [x, z] = WAYPOINTS[current]
      const [nx, nz] = WAYPOINTS[neighbor]
      const cost = (distance.get(current) ?? Infinity) + Math.hypot(nx - x, nz - z)
      if (cost < (distance.get(neighbor) ?? Infinity)) {
        distance.set(neighbor, cost)
        previous.set(neighbor, current)
      }
    }
  }
  if (!previous.has(to)) throw new Error(`No path from ${from} to ${to}`)
  const route: Waypoint[] = []
  for (let point: Waypoint | undefined = to; point && point !== from; point = previous.get(point)) route.unshift(point)
  return route
}
