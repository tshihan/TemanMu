import type { RoomId, Waypoint } from '../character/navigation'

export type InteractionId = 'bathroomTap' | 'shower' | 'kitchenKettle' | 'television' | 'bedroomLamp' | 'mainDoor' | 'telephone'
export type TelephoneState = 'idle' | 'ringing' | 'answering' | 'finished'
export type ObjectStates = {
  bathroomTap: boolean; shower: boolean; kitchenKettle: boolean; television: boolean; bedroomLamp: boolean
  mainDoor: boolean; telephone: TelephoneState
}
export type InteractionBindings = {
  states: ObjectStates; selected: InteractionId | null; hovered: InteractionId | null
  paused?: boolean
  disabled?: boolean
  responderDoorOpen?: boolean
  /** Shown over the mobile phone after Unusual Inactivity's call goes unanswered. */
  phoneTag?: string | null
  phoneSpot?: PhoneSpot
  onSelect: (id: InteractionId) => void; onHover: (id: InteractionId | null) => void
}
export const INITIAL_OBJECT_STATES: ObjectStates = {
  bathroomTap: false, shower: false, kitchenKettle: false, television: false, bedroomLamp: false,
  mainDoor: false, telephone: 'idle',
}

export const INTERACTIONS: Record<InteractionId, { label: string; approach: Waypoint; room: RoomId; target: [number, number] }> = {
  bathroomTap: { label: 'Bathroom Tap', approach: 'tapApproach', room: 'bathroom', target: [.35, -4.02] },
  shower: { label: 'Shower', approach: 'showerApproach', room: 'bathroom', target: [2.55, -2.12] },
  kitchenKettle: { label: 'Kitchen Kettle', approach: 'kettleApproach', room: 'kitchen', target: [5, 2.07] },
  television: { label: 'Television', approach: 'tvApproach', room: 'living', target: [-5.02, 1.55] },
  bedroomLamp: { label: 'Bedroom Lamp', approach: 'bedside', room: 'bedroom', target: [-1.22, -4.13] },
  mainDoor: { label: 'Main Door', approach: 'mainDoor', room: 'mainDoor', target: [1.5, 5] },
  telephone: { label: 'Mobile Phone', approach: 'phoneApproach', room: 'living', target: [-2.65, 2.38] },
}

/** The mobile phone lives on the coffee table, except during the nap, when it is on the bedside table. */
export type PhoneSpot = 'living' | 'bedside'
const PHONE_SPOTS: Record<PhoneSpot, Pick<(typeof INTERACTIONS)['telephone'], 'approach' | 'room' | 'target'>> = {
  living: { approach: 'phoneApproach', room: 'living', target: [-2.65, 2.38] },
  bedside: { approach: 'bedside', room: 'bedroom', target: [-1.36, -3.97] },
}
export function interactionSpot(id: InteractionId, phoneSpot: PhoneSpot = 'living') {
  return id === 'telephone' ? { ...INTERACTIONS.telephone, ...PHONE_SPOTS[phoneSpot] } : INTERACTIONS[id]
}

export function interactionPrompt(id: InteractionId, states: ObjectStates) {
  switch (id) {
    case 'bathroomTap': return states.bathroomTap ? 'Turn Off Tap' : 'Use Tap'
    case 'shower': return states.shower ? 'Turn Off Shower' : 'Turn On Shower'
    case 'kitchenKettle': return states.kitchenKettle ? 'Switch Off Kettle' : 'Switch On Kettle'
    case 'television': return states.television ? 'Turn Off TV' : 'Turn On TV'
    case 'bedroomLamp': return states.bedroomLamp ? 'Turn Off Bedroom Lamp' : 'Turn On Bedroom Lamp'
    case 'mainDoor': return states.mainDoor ? 'Close Door' : 'Open Door'
    case 'telephone': return 'Answer Mobile Phone'
  }
}
