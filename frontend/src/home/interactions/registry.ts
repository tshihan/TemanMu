import type { RoomId, Waypoint } from '../character/navigation'

export type InteractionId = 'bathroomTap' | 'kitchenKettle' | 'mainDoor' | 'telephone'
export type TelephoneState = 'idle' | 'ringing' | 'answering' | 'finished'
export type ObjectStates = { bathroomTap: boolean; kitchenKettle: boolean; mainDoor: boolean; telephone: TelephoneState }
export type InteractionBindings = {
  states: ObjectStates; selected: InteractionId | null; hovered: InteractionId | null
  paused?: boolean
  disabled?: boolean
  onSelect: (id: InteractionId) => void; onHover: (id: InteractionId | null) => void
}
export const INITIAL_OBJECT_STATES: ObjectStates = { bathroomTap: false, kitchenKettle: false, mainDoor: false, telephone: 'idle' }

export const INTERACTIONS: Record<InteractionId, { label: string; approach: Waypoint; room: RoomId; target: [number, number] }> = {
  bathroomTap: { label: 'Bathroom Tap', approach: 'tapApproach', room: 'bathroom', target: [.35, -4.02] },
  kitchenKettle: { label: 'Kitchen Kettle', approach: 'kettleApproach', room: 'kitchen', target: [5, 2.07] },
  mainDoor: { label: 'Main Door', approach: 'mainDoor', room: 'mainDoor', target: [1.5, 5] },
  telephone: { label: 'Telephone', approach: 'phoneApproach', room: 'living', target: [-4.72, 4.05] },
}

export function interactionPrompt(id: InteractionId, states: ObjectStates) {
  switch (id) {
    case 'bathroomTap': return states.bathroomTap ? 'Turn Off Tap' : 'Use Tap'
    case 'kitchenKettle': return states.kitchenKettle ? 'Switch Off Kettle' : 'Switch On Kettle'
    case 'mainDoor': return states.mainDoor ? 'Close Door' : 'Open Door'
    case 'telephone': return 'Answer Telephone'
  }
}
