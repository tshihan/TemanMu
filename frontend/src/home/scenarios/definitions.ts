import type { Waypoint } from '../character/navigation'
import type { InteractionId } from '../interactions/registry'

export type ScenarioId = 'normalMorning' | 'goingOut' | 'unusualInactivity' | 'falseAlarmRecovery'
export type ScenarioTiming = { outsideSeconds: number; recoverySeconds: number }
export const DEFAULT_TIMING: ScenarioTiming = { outsideSeconds: 4, recoverySeconds: 3 }
export const SCENARIO_LABELS: Record<ScenarioId, string> = {
  normalMorning: 'Normal Morning', goingOut: 'Going Out',
  unusualInactivity: 'Unusual Inactivity', falseAlarmRecovery: 'False Alarm Recovery',
}

export type ScenarioStep =
  | { kind: 'move'; to: Waypoint; label: string }
  | { kind: 'interact'; object: InteractionId; label: string; approach?: Waypoint }
  | { kind: 'animate'; animation: 'rest' | 'wake' | 'collapse' | 'recover'; label: string }
  | { kind: 'wait'; seconds: number; label: string }
  | { kind: 'visible'; value: boolean; label: string }
  | { kind: 'object'; object: InteractionId; value: boolean; label: string }
  | { kind: 'hold'; label: string }

export function scenarioSteps(id: ScenarioId, timing: ScenarioTiming): ScenarioStep[] {
  switch (id) {
    case 'normalMorning': return [
      { kind: 'move', to: 'bedside', label: 'Returning to the bedside' },
      { kind: 'animate', animation: 'rest', label: 'Resting in bed' },
      { kind: 'wait', seconds: 1.2, label: 'A quiet moment' },
      { kind: 'animate', animation: 'wake', label: 'Waking and getting out of bed' },
      { kind: 'move', to: 'bathroom', label: 'Walking to the bathroom' },
      { kind: 'interact', object: 'bathroomTap', label: 'Turning on the bathroom tap' },
      { kind: 'wait', seconds: 1.8, label: 'Using the sink' },
      { kind: 'interact', object: 'bathroomTap', label: 'Turning off the bathroom tap' },
      { kind: 'move', to: 'kitchen', label: 'Walking to the kitchen' },
      { kind: 'interact', object: 'kitchenKettle', label: 'Switching on the kettle' },
      { kind: 'wait', seconds: 2.2, label: 'Waiting for the kettle' },
      { kind: 'interact', object: 'kitchenKettle', label: 'Switching off the kettle' },
    ]
    case 'goingOut': return [
      { kind: 'move', to: 'mainDoor', label: 'Walking to the entrance' },
      { kind: 'interact', object: 'mainDoor', label: 'Opening the main door' },
      { kind: 'move', to: 'outside', label: 'Walking through the doorway' },
      { kind: 'visible', value: false, label: 'Leaving the interior view' },
      { kind: 'object', object: 'mainDoor', value: false, label: 'Closing the door' },
      { kind: 'wait', seconds: timing.outsideSeconds, label: 'Away from home' },
      { kind: 'visible', value: true, label: 'Returning to the porch' },
      { kind: 'move', to: 'porch', label: 'Approaching the door from outside' },
      { kind: 'interact', object: 'mainDoor', approach: 'porch', label: 'Opening the door from outside' },
      { kind: 'move', to: 'mainDoor', label: 'Walking back inside' },
      { kind: 'interact', object: 'mainDoor', label: 'Closing the main door' },
      { kind: 'move', to: 'dining', label: 'Settling back inside' },
    ]
    case 'unusualInactivity': return [
      { kind: 'move', to: 'collapseSpot', label: 'Walking beside the sofa' },
      { kind: 'animate', animation: 'collapse', label: 'Becoming unsteady and collapsing' },
      { kind: 'hold', label: 'Lying still until stopped' },
    ]
    case 'falseAlarmRecovery': return [
      { kind: 'move', to: 'collapseSpot', label: 'Walking beside the sofa' },
      { kind: 'animate', animation: 'collapse', label: 'Becoming unsteady and collapsing' },
      { kind: 'wait', seconds: timing.recoverySeconds, label: 'Resting on the floor' },
      { kind: 'animate', animation: 'recover', label: 'Gradually getting up' },
      { kind: 'move', to: 'bathroom', label: 'Walking to the bathroom' },
      { kind: 'interact', object: 'bathroomTap', label: 'Turning on the bathroom tap' },
      { kind: 'wait', seconds: 1.8, label: 'Using the sink' },
      { kind: 'interact', object: 'bathroomTap', label: 'Turning off the bathroom tap' },
    ]
  }
}
