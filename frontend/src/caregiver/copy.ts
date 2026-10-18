import type { LucideIcon } from 'lucide-react'
import { Bell, BellRing, CircleCheck, DoorOpen, Droplets, Heart, Info, PhoneMissed, PhoneOff, PhoneOutgoing, ShieldCheck, Sunrise, TriangleAlert, Users } from 'lucide-react'
import seed from '../../../shared/seed.json'
import type { Incident, IncidentEvent, Notification, Outcome, Status, Unit } from '../api/types'

export type Tone = 'alarm' | 'calm' | 'warm' | 'info'
export interface Copy { title: string; body: string; Icon: LucideIcon; tone: Tone }

export const GUARD = seed.responders.township

export const OUTCOMES: { value: Exclude<Outcome, 'resident_activity_detected'>; label: string; help: string }[] = [
  { value: 'resident_ok', label: 'Resident OK', help: 'Checked in person, no help needed' },
  { value: 'assistance_provided', label: 'Assistance provided', help: 'Help was needed and given' },
  { value: 'resident_away', label: 'Resident was away', help: 'Not at home when checked' },
]
export const outcomeLabel = (outcome: Outcome | null | undefined) =>
  outcome === 'resident_activity_detected' ? 'Resident activity detected' : OUTCOMES.find(item => item.value === outcome)?.label || 'Resolved'

export const STATUS_LABELS: Record<Status, string> = {
  routine: 'Routine', possible_away: 'Possible Away', unusual_inactivity: 'Unusual Inactivity', unresolved_concern: 'Unresolved Concern',
}

/** What the caregiver app needs to phrase things: who "Mum" is and who "you" are. */
export interface Ctx { R: string; me: string }
export const ctxFor = (unit: Unit): Ctx => ({ R: unit.caregiver_relationship, me: unit.caregiver_name })

const isMe = (ctx: Ctx, actor: { role: string; name: string } | null | undefined) => actor?.role === 'caregiver' && actor.name === ctx.me
export const actorName = (ctx: Ctx, actor: { role: string; name: string } | null | undefined, capital = true) =>
  isMe(ctx, actor) ? capital ? 'You' : 'you' : actor?.name || 'A responder'

/** Incidents open on a water quiet gap or on an outing that ran too long; the copy differs. */
export const isOuting = (incident: Incident | null | undefined) =>
  !!incident?.events.some(event => event.type === 'detected' && /outing/i.test(event.detail || ''))

const cause = (ctx: Ctx, incident: Incident | null | undefined) =>
  isOuting(incident) ? `${ctx.R} has been out longer than usual` : 'No water use for longer than usual'

export function notificationCopy(n: Notification, ctx: Ctx, incident: Incident | null | undefined): Copy {
  const { R } = ctx
  switch (n.kind) {
    case 'morning_reassurance':
      return { title: `${R}’s day has started.`, body: n.message.match(/day has started\.\s*(.+)$/)?.[1] || 'Activity detected at home.', Icon: Sunrise, tone: 'calm' }
    case 'alert':
      return { title: 'Safety alert', body: `${cause(ctx, incident)}, and ${R} didn’t answer the simulated call. ${GUARD} has been alerted too.`, Icon: TriangleAlert, tone: 'alarm' }
    case 'reminder': {
      const number = n.message.match(/#(\d+)/)?.[1]
      return { title: number ? `Reminder #${number}` : 'Reminder', body: `Nobody has responded yet. Sent to you and ${GUARD}.`, Icon: BellRing, tone: 'alarm' }
    }
    case 'acknowledged': {
      const by = incident?.acknowledged_by
      const name = by ? actorName(ctx, by) : n.message.replace(/ is checking now\.?$/, '')
      return { title: name === 'You' ? 'You’re checking' : `${name} is checking`, body: `Reminders stopped for everyone. ${R} is not yet confirmed safe.`, Icon: ShieldCheck, tone: 'info' }
    }
    case 'closed':
      return {
        title: `Closed: ${incident ? outcomeLabel(incident.outcome) : n.message.replace(/^Incident closed: |\.$/g, '')}`,
        body: `Recorded by ${actorName(ctx, incident?.acknowledged_by, false)}. The incident is closed.`, Icon: CircleCheck, tone: 'calm',
      }
    case 'auto_resolved':
      return { title: 'Resident activity detected', body: 'Activity at home ended the alert. No in-person check was recorded.', Icon: CircleCheck, tone: 'calm' }
    case 'message_delivered': {
      const text = n.message.match(/"(.+)"/)?.[1]
      return { title: 'Message delivered', body: text ? `“${text}” was delivered to ${R} by voice call (simulated).` : `Delivered to ${R} by voice call (simulated).`, Icon: Heart, tone: 'warm' }
    }
    case 'buddy_matched': {
      const match = n.message.match(/with (.+), who also enjoys (.+)$/)
      return { title: 'Buddy matched', body: match ? `${match[1]} shares ${R}’s interest in ${match[2]} (simulated match).` : `${n.message} (simulated match).`, Icon: Users, tone: 'warm' }
    }
  }
  return { title: 'Update', body: n.message, Icon: Bell, tone: 'info' }
}

export function eventCopy(event: IncidentEvent, ctx: Ctx, incident: Incident): Copy {
  const { R } = ctx
  switch (event.type) {
    case 'detected':
      return isOuting(incident)
        ? { title: 'Outing longer than usual', body: `${R} has been away longer than usual.`, Icon: DoorOpen, tone: 'info' }
        : { title: 'Quiet gap detected', body: 'No water use for longer than the usual gap.', Icon: Droplets, tone: 'info' }
    case 'voice_call_started': return { title: `Simulated call to ${R}`, body: `TemanMu called ${R} automatically (simulated).`, Icon: PhoneOutgoing, tone: 'info' }
    case 'voice_call_no_answer': return { title: 'No answer', body: `${R} didn’t answer the simulated call.`, Icon: PhoneMissed, tone: 'alarm' }
    case 'voice_call_cancelled': return { title: 'Call stopped', body: 'The simulated call was stopped.', Icon: PhoneOff, tone: 'info' }
    case 'notified': return { title: 'Alert sent', body: `You and ${GUARD} were alerted together.`, Icon: BellRing, tone: 'alarm' }
    case 'reminder': return { title: event.detail || 'Reminder', body: `Sent to you and ${GUARD}.`, Icon: BellRing, tone: 'alarm' }
    case 'acknowledged':
      return { title: `${actorName(ctx, event.actor)} tapped I’ll Check Now`, body: `Reminders stopped for everyone. ${R} not yet confirmed safe.`, Icon: ShieldCheck, tone: 'info' }
    case 'auto_resolved': return { title: 'Resident activity detected', body: 'Activity at home ended the alert.', Icon: CircleCheck, tone: 'calm' }
    case 'closed':
      return { title: `Outcome: ${outcomeLabel(incident.outcome)}`, body: `Recorded by ${actorName(ctx, event.actor, false)}. Incident closed.`, Icon: CircleCheck, tone: 'calm' }
  }
  return { title: event.type, body: event.detail || '', Icon: Info, tone: 'info' }
}

export const NOTIFICATION_TARGET: Record<Notification['kind'], 'incident' | 'home' | 'together'> = {
  alert: 'incident', reminder: 'incident', acknowledged: 'incident', closed: 'incident', auto_resolved: 'incident',
  morning_reassurance: 'home', message_delivered: 'together', buddy_matched: 'together',
}
