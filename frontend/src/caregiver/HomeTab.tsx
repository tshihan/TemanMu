import type { LucideIcon } from 'lucide-react'
import { ChevronRight, CircleCheck, DoorOpen, Droplets, Heart, Phone, PhoneOutgoing, ShieldCheck, Sunrise, TriangleAlert, Zap } from 'lucide-react'
import type { Incident, Notification, Reading, Unit } from '../api/types'
import { actorName, GUARD, isOuting, outcomeLabel, STATUS_LABELS, type Ctx } from './copy'
import { clock, greeting, isToday, until, when } from './format'

type Variant = 'alarm' | 'checking' | 'quiet' | 'away' | 'calm'
interface Card { variant: Variant; Icon: LucideIcon; badge: string; headline: string; reason: string; grace?: string; ack?: boolean; open?: string }

function statusCard(unit: Unit, incident: Incident | null, ctx: Ctx, now: number, dayStarted: boolean): Card {
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
  return { variant: 'calm', Icon: CircleCheck, badge: STATUS_LABELS.routine, headline: 'All looks normal',
    reason: dayStarted ? 'Water and electricity activity within usual routine.' : 'No activity yet today.' }
}

interface Props {
  unit: Unit; ctx: Ctx; incident: Incident | null; feed: Notification[]; readings: Reading[]; now: number
  ackBusy: boolean; onAck: () => void; onOpenIncident: () => void; onCall: () => void; onTogether: () => void
}

export function HomeTab({ unit, ctx, incident, feed, readings, now, ackBusy, onAck, onOpenIncident, onCall, onTogether }: Props) {
  const { R } = ctx
  const today = readings.filter(reading => isToday(reading.recorded_at, now))
  const last = (match: (reading: Reading) => boolean) => [...today].reverse().find(match)
  const water = last(reading => reading.sensor === 'water' && Number(reading.value) > 0)
  const power = last(reading => reading.sensor === 'electricity')
  const doorOpened = last(reading => reading.sensor === 'door' && reading.value === 'open')
  const morning = feed.find(item => item.kind === 'morning_reassurance' && isToday(item.created_at, now))
  const card = statusCard(unit, incident, ctx, now, !!morning || !!water || !!power || !!doorOpened)
  const updatedAt = Math.max(new Date(unit.status_since).getTime(), ...readings.slice(-1).map(reading => new Date(reading.recorded_at).getTime()))
  const rows: { Icon: LucideIcon; label: string; value: string; time: string }[] = [
    { Icon: Droplets, label: 'Water', value: water ? 'Last used' : 'Not used yet today', time: water ? clock(water.recorded_at) : '—' },
    { Icon: Zap, label: 'Electricity', value: unit.latest.power_kw > unit.baseline.standby_power_kw ? 'In use' : 'Standby', time: power ? clock(power.recorded_at) : '—' },
    { Icon: DoorOpen, label: 'Front door', value: unit.latest.door === 'open' ? 'Open now' : doorOpened ? 'Last opened' : 'Not opened today', time: doorOpened ? clock(doorOpened.recorded_at) : '—' },
  ]

  return <div className="cg-page">
    <div className="cg-intro">
      <p>{greeting(now)}, {ctx.me.split(' ')[0]}</p>
      <h1 className="cg-display">Here’s how {R} is doing.</h1>
    </div>

    <section aria-label="Current status" className={`cg-status is-${card.variant}`}>
      <div className="cg-status-who">
        <strong className="cg-serif">{R}</strong>
        <span className="cg-status-muted">{unit.resident_name} · Unit {unit.unit_id}</span>
      </div>
      <span className="cg-badge"><card.Icon size={16} aria-hidden="true" /><span>{card.badge}</span></span>
      <h2 className="cg-status-headline">{card.headline}</h2>
      <p className="cg-status-reason">{card.reason}</p>
      {card.grace && <p className="cg-status-meta">Simulated call window ends in <strong className="cg-num">{card.grace}</strong>. You’ll only be alerted if {R} doesn’t answer.</p>}
      {card.ack && <button type="button" className="cg-btn cg-btn-inverse" onClick={onAck} disabled={ackBusy}>
        {!ackBusy && <ShieldCheck size={22} aria-hidden="true" />}{ackBusy ? 'Recording…' : 'I’ll Check Now'}
      </button>}
      {card.open && <button type="button" className="cg-btn cg-btn-outline-o" onClick={onOpenIncident}>{card.open}<ChevronRight size={20} aria-hidden="true" /></button>}
      <p className="cg-status-meta">Updated {when(updatedAt, now)}</p>
    </section>

    <div className="cg-quick">
      <button type="button" className="cg-quick-call" onClick={onCall}>
        <span><Phone size={18} aria-hidden="true" />Call {R}</span><small>Simulated</small>
      </button>
      <button type="button" className="cg-quick-send" onClick={onTogether}>
        <span><Heart size={18} aria-hidden="true" />Send a thought</span><small>One tap, by voice</small>
      </button>
    </div>

    {morning && <div className="cg-morning">
      <span className="cg-morning-icon"><Sunrise size={18} aria-hidden="true" /></span>
      <span><strong>{R}’s day has started</strong><span>First activity at home at {clock(morning.created_at)}</span></span>
    </div>}

    <section className="cg-card" aria-labelledby="cg-today-heading">
      <h2 id="cg-today-heading" className="cg-card-title">Today at home</h2>
      <div className="cg-rows">
        {rows.map(row => <div key={row.label} className="cg-row">
          <span className="cg-row-icon"><row.Icon size={20} aria-hidden="true" /></span>
          <strong>{row.label}</strong>
          <span className="cg-row-value"><span>{row.value}</span><small>{row.time}</small></span>
        </div>)}
      </div>
      <p className="cg-fineprint">TemanMu only knows water, electricity and door activity. There are no cameras and no location tracking.</p>
    </section>
  </div>
}
