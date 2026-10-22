import type { Waypoint } from '../character/navigation'
import type { InteractionId } from '../interactions/registry'

export type ScenarioId = 'normalMorning' | 'goingOut' | 'unusualInactivity' | 'falseAlarmRecovery'
export type ScenarioTiming = { outsideSeconds: number }
export const DEFAULT_TIMING: ScenarioTiming = { outsideSeconds: 4 }
export const SCENARIO_LABELS: Record<ScenarioId, string> = {
  normalMorning: 'Normal Morning', goingOut: 'Going Out',
  unusualInactivity: 'Unusual Inactivity', falseAlarmRecovery: 'False Alarm Recovery',
}
export const SCENARIO_DESCRIPTIONS: Record<ScenarioId, string> = {
  normalMorning: 'Wakes, uses the tap and kettle. Readings stay within routine.',
  goingOut: 'Door opens, the home goes quiet, she returns. Read as a possible outing.',
  unusualInactivity: 'A long water quiet gap with no outing evidence escalates to the township.',
  falseAlarmRecovery: 'She is napping, wakes to the call and confirms she is okay. The concern resolves.',
}

export type ScenarioStep =
  | { kind: 'move'; to: Waypoint; label: string }
  | { kind: 'interact'; object: InteractionId; value: boolean; label: string; approach?: Waypoint }
  | { kind: 'animate'; animation: 'rest' | 'wake' | 'collapse' | 'recover'; label: string }
  | { kind: 'wait'; seconds: number; label: string }
  | { kind: 'visible'; value: boolean; label: string }
  | { kind: 'object'; object: InteractionId; value: boolean; label: string }
  | { kind: 'quietGap'; label: string }
  | { kind: 'noAnswer'; label: string }
  | { kind: 'alert'; label: string }
  | { kind: 'dispatchResponder'; label: string }
  | { kind: 'responderVisible'; label: string }
  | { kind: 'responderDoor'; open: boolean; label: string }
  | { kind: 'responderMove'; to: Waypoint; label: string }
  | { kind: 'responderCheck'; label: string }
  | { kind: 'resolution'; label: string }
  | { kind: 'confirmCall'; label: string }
  | { kind: 'hold'; label: string }

export function scenarioSteps(id: ScenarioId, timing: ScenarioTiming, compressedDemoTime = false): ScenarioStep[] {
  const quietGapLabel = compressedDemoTime
    ? 'Demo time jump: usual water quiet gap has elapsed; no outing evidence'
    : 'Waiting for the real water quiet gap and backend check'
  switch (id) {
    case 'normalMorning': return [
      { kind: 'move', to: 'bedside', label: 'Returning to the bedside' },
      { kind: 'animate', animation: 'rest', label: 'Resting in bed' },
      { kind: 'wait', seconds: 1.2, label: 'A quiet moment' },
      { kind: 'animate', animation: 'wake', label: 'Waking and getting out of bed' },
      { kind: 'move', to: 'bathroom', label: 'Walking to the bathroom' },
      { kind: 'interact', object: 'bathroomTap', value: true, label: 'Turning on the bathroom tap' },
      { kind: 'wait', seconds: 1.8, label: 'Using the sink' },
      { kind: 'interact', object: 'bathroomTap', value: false, label: 'Turning off the bathroom tap' },
      { kind: 'move', to: 'kitchen', label: 'Walking to the kitchen' },
      { kind: 'interact', object: 'kitchenKettle', value: true, label: 'Switching on the kettle' },
      { kind: 'wait', seconds: 2.2, label: 'Waiting for the kettle' },
      { kind: 'interact', object: 'kitchenKettle', value: false, label: 'Switching off the kettle' },
    ]
    case 'goingOut': return [
      { kind: 'move', to: 'mainDoor', label: 'Walking to the entrance' },
      { kind: 'interact', object: 'mainDoor', value: true, label: 'Opening the main door' },
      { kind: 'move', to: 'outside', label: 'Walking through the doorway' },
      { kind: 'visible', value: false, label: 'Leaving the interior view' },
      { kind: 'object', object: 'mainDoor', value: false, label: 'Closing the door' },
      { kind: 'wait', seconds: timing.outsideSeconds, label: 'Away from home' },
      { kind: 'visible', value: true, label: 'Returning to the porch' },
      { kind: 'move', to: 'porch', label: 'Approaching the door from outside' },
      { kind: 'interact', object: 'mainDoor', value: true, approach: 'porch', label: 'Opening the door from outside' },
      { kind: 'move', to: 'mainDoor', label: 'Walking back inside' },
      { kind: 'interact', object: 'mainDoor', value: false, label: 'Closing the main door' },
      { kind: 'move', to: 'dining', label: 'Settling back inside' },
    ]
    case 'unusualInactivity': return [
      { kind: 'move', to: 'collapseSpot', label: 'Walking beside the sofa' },
      { kind: 'animate', animation: 'collapse', label: 'Audience-only fall; no sensor event' },
      { kind: 'wait', seconds: 2, label: 'No water use; the home remains quiet' },
      { kind: 'quietGap', label: quietGapLabel },
      { kind: 'noAnswer', label: 'Simulated call to Mum; waiting for an answer' },
      { kind: 'alert', label: 'No answer; waiting for caregiver and township alert' },
      ...(compressedDemoTime ? [{ kind: 'wait' as const, seconds: 6, label: 'Caregiver and township can respond' }] : []),
      { kind: 'dispatchResponder', label: compressedDemoTime ? 'Guard Ali accepts the township alert (demo)' : 'Waiting for Guard Ali to acknowledge on the township dashboard' },
      { kind: 'responderVisible', label: 'Guard Ali arrives outside A-105' },
      { kind: 'responderMove', to: 'porch', label: 'Guard Ali approaches the entrance' },
      { kind: 'responderDoor', open: true, label: 'Guard Ali opens the door (visual reenactment)' },
      { kind: 'responderMove', to: 'responderCheck', label: 'Guard Ali enters and walks to Madam Lee' },
      { kind: 'responderDoor', open: false, label: 'Guard Ali closes the door' },
      { kind: 'responderCheck', label: 'Guard Ali checks Madam Lee’s condition' },
      { kind: 'hold', label: 'Guard Ali is checking; outcome awaits a human report' },
    ]
    case 'falseAlarmRecovery': return [
      { kind: 'move', to: 'bedside', label: 'Settling down for a nap' },
      { kind: 'animate', animation: 'rest', label: 'Madam Lee is napping; no sensor event' },
      { kind: 'wait', seconds: 2, label: 'The home stays quiet while she sleeps' },
      { kind: 'quietGap', label: quietGapLabel },
      { kind: 'wait', seconds: 4, label: 'The mobile phone rings while Madam Lee is still napping' },
      { kind: 'animate', animation: 'wake', label: 'Madam Lee hears the phone and wakes up' },
      { kind: 'confirmCall', label: 'Answering the call: “I’m okay, I was just sleeping.”' },
      { kind: 'resolution', label: 'Backend confirms Resident OK and cancels escalation' },
    ]
  }
}
