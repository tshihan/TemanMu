import type { LucideIcon } from 'lucide-react'
import { ChevronRight, CircleCheck, Clock3, DoorOpen, Droplets, Phone, PhoneOutgoing, ShieldCheck, Sunrise, TriangleAlert, Zap } from 'lucide-react'
import type { Incident, Notification, Reading, Unit } from '../api/types'
import { actorName, GUARD, isOuting, notificationCopy, outcomeLabel, STATUS_LABELS, type Ctx } from './copy'
import { clock, greeting, isToday, until, when } from './format'

type Variant = 'alarm' | 'checking' | 'quiet' | 'away' | 'calm' | 'pending'
interface Card { variant: Variant; Icon: LucideIcon; badge: string; headline: string; reason: string; grace?: string; ack?: boolean; open?: string }

function statusCard(unit: Unit, incident: Incident | null, ctx: Ctx, now: number, hasRoutineEvidence: boolean): Card {
  const { R } = ctx
  const doorAt = unit.latest.last_door_event_at
  if (incident?.state === 'notified') {
    const cause = isOuting(incident) ? `${R} has been out longer than usual` : 'No water use for longer than the usual gap'
    const reminder = incident.reminder_count ? ` Reminder #${incident.reminder_count}.` : ''
    return { variant: 'alarm', Icon: TriangleAlert, badge: STATUS_LABELS[unit.status], headline: `${R} didn’t answer`, ack: true,
      reason: `${cause}, and the simulated call went unanswered. You and ${GUARD} have been alerted.${reminder}` }
  }
  if (incident?.state === 'acknowledged' && incident.acknowledged_by) {
    const who = actorName(ctx, incident.acknowledged_by)
    return { variant: 'checking', Icon: ShieldCheck, badge: STATUS_LABELS[unit.status], headline: `${who} ${who === 'You' ? 'are' : 'is'} checking`,
      reason: `Taken at ${clock(incident.acknowledged_by.at)}. Reminders have stopped. ${R} is not yet confirmed safe.`,
      open: who === 'You' ? 'Record outcome' : 'View alert' }
  }
  if (incident?.state === 'grace' || unit.status === 'unusual_inactivity') {
    const lastWater = unit.quiet_gap.last_water_activity_at
    const cause = isOuting(incident) && doorAt ? `${R} has been out since ${clock(doorAt)}, longer than usual.`
      : lastWater ? `No water use since ${clock(lastWater)}, longer than the usual gap.` : 'No water use for longer than the usual gap.'
    return { variant: 'quiet', Icon: PhoneOutgoing, badge: STATUS_LABELS.unusual_inactivity, headline: `Checking on ${R} quietly`,
      reason: `${cause} TemanMu is calling ${R} now (simulated).`, grace: incident?.state === 'grace' ? until(incident.grace_ends_at, now) : undefined }
  }
  if (unit.status === 'possible_away') return { variant: 'away', Icon: DoorOpen, badge: STATUS_LABELS.possible_away, headline: `${R} is probably out`,
    reason: `${doorAt ? `Door opened at ${clock(doorAt)}` : 'The door opened'}, then the home went quiet. This is normal, and nobody has been notified.` }

  // A just-finished incident stays visible until the status changes again.
  const recent = incident?.closed_at && ['closed', 'auto_resolved'].includes(incident.state)
    && new Date(incident.closed_at).getTime() >= new Date(unit.status_since).getTime() - 2000
  if (recent && incident.state === 'closed') return { variant: 'calm', Icon: CircleCheck, badge: STATUS_LABELS.routine, headline: 'Alert closed',
    reason: `Outcome: ${outcomeLabel(incident.outcome)}. Recorded by ${actorName(ctx, incident.acknowledged_by, false)} at ${clock(incident.closed_at!)}.` }
  if (recent) return { variant: 'calm', Icon: CircleCheck, badge: STATUS_LABELS.routine, headline: 'Activity has resumed',
    reason: `Resident activity detected at ${clock(incident!.closed_at!)}. The alert ended on its own.` }
  return hasRoutineEvidence
    ? { variant: 'calm', Icon: CircleCheck, badge: STATUS_LABELS.routine, headline: 'All looks normal',
      reason: 'Activity detected at home within the usual routine.' }
    : { variant: 'pending', Icon: Clock3, badge: 'Awaiting routine activity', headline: 'Routine activity not confirmed yet',
      reason: 'No water or electricity use has been confirmed at home today.' }
}

interface Props {
  unit: Unit; ctx: Ctx; incident: Incident | null; feed: Notification[]; readings: Reading[]; now: number
  ackBusy: boolean; onAck: () => void; onOpenIncident: () => void; onCall: () => void
}

export function HomeTab({ unit, ctx, incident, feed, readings, now, ackBusy, onAck, onOpenIncident, onCall }: Props) {
  const { R } = ctx
  const today = readings.filter(reading => isToday(reading.recorded_at, now))
  const last = (match: (reading: Reading) => boolean) => [...today].reverse().find(match)
  const water = last(reading => reading.sensor === 'water' && Number(reading.value) > 0)
  const waterAt = water?.recorded_at ?? (unit.quiet_gap.last_water_activity_at && isToday(unit.quiet_gap.last_water_activity_at, now)
    ? unit.quiet_gap.last_water_activity_at : null)
  const power = last(reading => reading.sensor === 'electricity')
  const powerUsed = last(reading => reading.sensor === 'electricity' && Number(reading.value) > unit.baseline.standby_power_kw)
  const morning = feed.find(item => item.kind === 'morning_reassurance' && isToday(item.created_at, now))
  const card = statusCard(unit, incident, ctx, now, !!waterAt || !!powerUsed)
  const lastReadingAt = readings.at(-1)?.recorded_at
  const lastIncidentAt = incident?.events.at(-1)?.at
  const updatedAt = Math.max(new Date(unit.status_since).getTime(),
    ...(lastReadingAt ? [Date.parse(lastReadingAt)] : []),
    ...(lastIncidentAt ? [Date.parse(lastIncidentAt)] : []))
  const activityCards: { Icon: LucideIcon; label: string; value: string; time: string }[] = [
    { Icon: Droplets, label: 'Water', value: waterAt ? 'Used today' : 'No use yet', time: waterAt ? clock(waterAt) : 'Today' },
    { Icon: Zap, label: 'Electricity', value: unit.latest.power_kw > unit.baseline.standby_power_kw ? 'In use' : powerUsed ? 'Used today' : power ? 'Standby' : 'No use yet',
      time: powerUsed ? clock(powerUsed.recorded_at) : power ? clock(power.recorded_at) : 'Today' },
    { Icon: DoorOpen, label: 'Possible outing', value: unit.status === 'possible_away' ? 'Possible' : 'Not indicated',
      time: unit.status === 'possible_away' && unit.latest.last_door_event_at ? clock(unit.latest.last_door_event_at) : 'Currently' },
  ]
  const recent = [
    ...(waterAt && !water ? [{ at: waterAt, Icon: Droplets, title: 'Water used at home' }] : []),
    ...today.filter(reading => reading.sensor === 'door' ? reading.value === 'open'
      : reading.sensor === 'water' ? Number(reading.value) > 0 : Number(reading.value) > unit.baseline.standby_power_kw).map(reading => ({
      at: reading.recorded_at,
      Icon: reading.sensor === 'water' ? Droplets : reading.sensor === 'electricity' ? Zap : DoorOpen,
      title: reading.sensor === 'water' ? 'Water used at home' : reading.sensor === 'electricity' ? 'Electricity used at home' : 'Front door opened',
    })),
    ...(morning ? [{ at: morning.created_at, Icon: Sunrise, title: `${R}’s day has started`, detail: notificationCopy(morning, ctx, null).body }] : []),
  ].sort((a, b) => b.at.localeCompare(a.at))[0]

  return <div className="cg-page">
    <div className="cg-intro">
      <h1 className="cg-display">{greeting(now)}, {ctx.me.split(' ')[0]}</h1>
      <p>Here's how {R} is doing today.</p>
    </div>

    <section aria-label="Current status" className={`cg-status is-${card.variant}`}>
      <div className="cg-status-top">
        <strong className="cg-serif">{R}</strong>
        <span className="cg-badge"><card.Icon size={16} aria-hidden="true" /><span>{card.badge}</span></span>
      </div>
      <p className="cg-status-muted">{unit.resident_name} · Unit {unit.unit_id}</p>
      <h2 className="cg-status-headline">{card.headline}</h2>
      <p className="cg-status-reason">{card.reason}</p>
      {card.grace && <p className="cg-status-meta">Simulated call window ends in <strong className="cg-num">{card.grace}</strong>. You’ll only be alerted if {R} doesn’t answer.</p>}
      {card.ack && <button type="button" className="cg-btn cg-btn-inverse" onClick={onAck} disabled={ackBusy}>
        {!ackBusy && <ShieldCheck size={22} aria-hidden="true" />}{ackBusy ? 'Recording…' : 'I’ll Check Now'}
      </button>}
      {card.open && <button type="button" className="cg-btn cg-btn-outline-o" onClick={onOpenIncident}>{card.open}<ChevronRight size={20} aria-hidden="true" /></button>}
      <p className="cg-status-updated">Updated {when(updatedAt, now)}</p>
    </section>

    <section className="cg-status-activity" aria-label="Activity indicators">
      {activityCards.map(item => <div key={item.label} className="cg-status-activity-card">
        <span className="cg-status-activity-icon"><item.Icon size={18} aria-hidden="true" /></span>
        <span className="cg-status-activity-label">{item.label}</span>
        <span className="cg-status-activity-value"><strong>{item.value}</strong><small>{item.time}</small></span>
      </div>)}
    </section>

    <div className="cg-quick">
      <button type="button" className="cg-quick-call" onClick={onCall}>
        <span><Phone size={20} aria-hidden="true" />Call {R}</span><small>Simulated call</small>
      </button>
    </div>

    <section className="cg-recent" aria-labelledby="cg-recent-heading">
      <h2 id="cg-recent-heading" className="cg-card-title">Recent Activity</h2>
      <div className="cg-recent-event">
        <span className="cg-recent-icon">{recent ? <recent.Icon size={19} aria-hidden="true" /> : <Clock3 size={19} aria-hidden="true" />}</span>
        <span><strong>{recent?.title ?? 'No activity detected yet today'}</strong>
          {recent && 'detail' in recent && <span className="cg-recent-detail">{recent.detail}</span>}
          {recent && <time dateTime={recent.at}>Detected at {clock(recent.at)}</time>}</span>
      </div>
    </section>
  </div>
}
