import type { Waypoint } from '../character/navigation'
import type { InteractionId } from '../interactions/registry'
import type { CallTiming } from '../../api/types'

export type ScenarioId = 'normalMorning' | 'goingOut' | 'notBackYet' | 'tappedInNoActivity' | 'unusualInactivity' | 'falseAlarmRecovery'
export type ScenarioTiming = { outsideSeconds: number }
export const DEFAULT_TIMING: ScenarioTiming = { outsideSeconds: 4 }
/** Guard Ali knocks before entering; he walks in faster by the same amount, so the visit keeps its length. */
export const RESPONDER_KNOCK_SECONDS = 1.1
export const SCENARIO_LABELS: Record<ScenarioId, string> = {
  normalMorning: 'Normal Morning', goingOut: 'Going Out',
  notBackYet: 'Not Back Yet', tappedInNoActivity: 'Tapped In, Home Quiet',
  unusualInactivity: 'Unusual Inactivity', falseAlarmRecovery: 'False Alarm Recovery',
}
export const SCENARIO_DESCRIPTIONS: Record<ScenarioId, string> = {
  normalMorning: 'Wakes, uses the tap and kettle. Readings stay within routine.',
  goingOut: 'She taps her card out at the lift lobby, the home goes quiet, then she taps back in and returns.',
  notBackYet: 'She taps her card out and never taps back in, staying out far longer than usual.',
  tappedInNoActivity: 'She taps back in at the lobby but never reaches the flat; the home stays quiet.',
  unusualInactivity: 'A long water quiet gap with no outing evidence escalates to the township.',
  falseAlarmRecovery: 'She is napping, wakes to the call and confirms she is okay. The concern resolves.',
}

/** Simulated call pacing per quiet-gap scenario. A quick unanswered call for inactivity;
 * for the nap, the ring outlasts her waking and answering the bedside phone (about 12s). */
export const SCENARIO_CALL_TIMING: Partial<Record<ScenarioId, CallTiming>> = {
  unusualInactivity: { grace_period_seconds: 15, voice_call_ring_seconds: 2 },
  notBackYet: { grace_period_seconds: 15, voice_call_ring_seconds: 2 },
  tappedInNoActivity: { grace_period_seconds: 15, voice_call_ring_seconds: 2 },
  falseAlarmRecovery: { grace_period_seconds: 16, voice_call_ring_seconds: 14 },
}

export type ScenarioStep =
  | { kind: 'move'; to: Waypoint; label: string }
  | { kind: 'interact'; object: InteractionId; value: boolean; label: string; approach?: Waypoint }
  | { kind: 'animate'; animation: 'rest' | 'wake' | 'collapse' | 'recover'; label: string }
  | { kind: 'wait'; seconds: number; label: string }
  | { kind: 'visible'; value: boolean; label: string }
  | { kind: 'tapCard'; direction: 'out' | 'in'; label: string }
  | { kind: 'object'; object: InteractionId; value: boolean; label: string }
  | { kind: 'quietGap'; label: string }
  /** Card homes: the backend watch runs the outing or the tapped-in clock until it raises a concern. */
  | { kind: 'watchGap'; gap: 'outing' | 'arrival'; label: string }
  | { kind: 'noAnswer'; label: string }
  | { kind: 'alert'; label: string }
  | { kind: 'dispatchResponder'; label: string }
  | { kind: 'responderVisible'; label: string }
  | { kind: 'responderDoor'; open: boolean; label: string }
  | { kind: 'responderKnock'; seconds: number; label: string }
  // catchUp: seconds this walk makes up for an earlier pause, by walking faster.
  | { kind: 'responderMove'; to: Waypoint; catchUp?: number; label: string }
  | { kind: 'responderCheck'; label: string }
  | { kind: 'resolution'; label: string }
  | { kind: 'confirmCall'; label: string }
  | { kind: 'hold'; label: string }

/** Out through the front door, along the corridor, card tap out at the lift lobby, then out of view. */
function leaveViaLobby(timing: ScenarioTiming): ScenarioStep[] {
  return [
    { kind: 'move', to: 'mainDoor', label: 'Walking to the entrance' },
    { kind: 'interact', object: 'mainDoor', value: true, label: 'Opening the main door' },
    { kind: 'move', to: 'outside', label: 'Walking through the doorway' },
    { kind: 'object', object: 'mainDoor', value: false, label: 'Closing the door' },
    { kind: 'tapCard', direction: 'out', label: 'Tapping her access card out at the lift lobby' },
    { kind: 'move', to: 'lobby', label: 'Heading to the lift' },
    { kind: 'visible', value: false, label: 'Leaving the block' },
    { kind: 'wait', seconds: timing.outsideSeconds, label: 'Away from home' },
  ]
}
/** Back out of the lift and a card tap in at the lobby reader. */
function returnViaLobby(): ScenarioStep[] {
  return [
    { kind: 'visible', value: true, label: 'Back at the lift lobby' },
    { kind: 'tapCard', direction: 'in', label: 'Tapping her access card in at the lift lobby' },
  ]
}

export function scenarioSteps(id: ScenarioId, timing: ScenarioTiming): ScenarioStep[] {
  const quietGapLabel = 'Fast-forward: no water use, longer than her learned usual quiet gap; no outing evidence'
  switch (id) {
    case 'normalMorning': return [
      { kind: 'wait', seconds: 1.2, label: 'Asleep in bed' },
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
      ...leaveViaLobby(timing),
      ...returnViaLobby(),
      { kind: 'move', to: 'porch', label: 'Walking back along the corridor' },
      { kind: 'interact', object: 'mainDoor', value: true, approach: 'porch', label: 'Opening the door from outside' },
      { kind: 'move', to: 'mainDoor', label: 'Walking back inside' },
      { kind: 'interact', object: 'mainDoor', value: false, label: 'Closing the main door' },
      { kind: 'interact', object: 'kitchenKettle', value: true, label: 'Switching on the kettle: activity at home confirms she is back' },
      { kind: 'wait', seconds: 1.5, label: 'Making a drink' },
      { kind: 'interact', object: 'kitchenKettle', value: false, label: 'Switching off the kettle' },
    ]
    case 'notBackYet': return [
      ...leaveViaLobby(timing),
      { kind: 'watchGap', gap: 'outing', label: 'Fast-forward: out longer than her usual outing, with no tap back in' },
      { kind: 'noAnswer', label: 'Simulated call to Mum; waiting for an answer' },
      { kind: 'alert', label: 'No answer; caregiver and township alerted: not back yet' },
      { kind: 'hold', label: 'Township searches outside; outcome awaits a human report' },
    ]
    case 'tappedInNoActivity': return [
      ...leaveViaLobby(timing),
      ...returnViaLobby(),
      { kind: 'move', to: 'corridor', label: 'Walking back along the corridor' },
      { kind: 'animate', animation: 'collapse', label: 'Audience-only fall in the corridor; no sensor event' },
      { kind: 'watchGap', gap: 'arrival', label: 'Fast-forward: tapped in, but no water or power used at home' },
      { kind: 'noAnswer', label: 'Simulated call to Mum; waiting for an answer' },
      { kind: 'alert', label: 'No answer; caregiver and township alerted: tapped in, no activity' },
      { kind: 'hold', label: 'Township checks the corridor and lift; outcome awaits a human report' },
    ]
    case 'unusualInactivity': return [
      { kind: 'move', to: 'collapseSpot', label: 'Walking beside the sofa' },
      { kind: 'animate', animation: 'collapse', label: 'Audience-only fall; no sensor event' },
      { kind: 'wait', seconds: 2, label: 'No water use; the home remains quiet' },
      { kind: 'quietGap', label: quietGapLabel },
      { kind: 'noAnswer', label: 'Simulated call to Mum; waiting for an answer' },
      { kind: 'alert', label: 'No answer; waiting for caregiver and township alert' },
      { kind: 'dispatchResponder', label: 'Waiting for Guard Ali to acknowledge on the township dashboard' },
      { kind: 'responderVisible', label: 'Guard Ali arrives outside A-105' },
      { kind: 'responderMove', to: 'porch', label: 'Guard Ali approaches the entrance' },
      { kind: 'responderKnock', seconds: RESPONDER_KNOCK_SECONDS, label: 'Guard Ali knocks on the door' },
      { kind: 'responderDoor', open: true, label: 'Guard Ali opens the door (visual reenactment)' },
      { kind: 'responderMove', to: 'responderCheck', catchUp: RESPONDER_KNOCK_SECONDS, label: 'Guard Ali enters and walks to Madam Lee' },
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
