import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, CircleCheck, Clock3, DoorOpen, Droplets, PhoneOutgoing, ShieldCheck, Sunrise, TriangleAlert, Zap } from 'lucide-react'
import type { Incident, Notification, Reading, Unit } from '../api/types'
import { actorName, isOuting, notificationCopy, outcomeLabel, STATUS_LABELS, type Ctx } from './copy'
import { clock, dayFraction, dayLabel, greeting, isToday, until, when } from './format'

type Variant = 'alarm' | 'checking' | 'quiet' | 'away' | 'calm' | 'pending'
interface Card { variant: Variant; Icon: LucideIcon; badge: string; headline: string; reason: string; grace?: string; ack?: boolean; open?: string }

function statusCard(unit: Unit, incident: Incident | null, ctx: Ctx, now: number, hasRoutineEvidence: boolean): Card {
  const { R } = ctx
  const doorAt = unit.latest.last_door_event_at
  if (incident?.state === 'notified') {
    const cause = isOuting(incident) ? `${R} has been out longer than usual` : 'No water use for longer than the usual gap'
    const reminder = incident.reminder_count ? ` Reminder #${incident.reminder_count}.` : ''
    return { variant: 'alarm', Icon: TriangleAlert, badge: STATUS_LABELS[unit.status], headline: 'Unusual inactivity', ack: true,
      reason: `${cause}. The simulated call went unanswered. You and the township operator have been alerted.${reminder}` }
  }
  if (incident?.state === 'acknowledged' && incident.acknowledged_by) {
    const who = actorName(ctx, incident.acknowledged_by)
    const called = incident.events.some(event => event.type === 'emergency_called')
    const unable = incident.events.some(event => event.type === 'unable_to_verify')
    if (called || unable) return { variant: 'alarm', Icon: TriangleAlert, badge: called ? '999 call reported' : 'Safety unverified',
      headline: called ? 'Emergency handoff in progress' : 'Urgent follow-up needed',
      reason: called ? `${who} reports calling 999. Dispatch has not been confirmed.` : `${who} could not verify ${R}’s safety.`, open: 'View alert' }
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
    reason: `Outcome: ${outcomeLabel(incident.outcome)}. Recorded by ${actorName(ctx, incident.events.find(event => event.type === 'closed')?.actor ?? incident.acknowledged_by, false)} at ${clock(incident.closed_at!)}.` }
  if (recent) return { variant: 'calm', Icon: CircleCheck, badge: STATUS_LABELS.routine, headline: 'Activity has resumed',
    reason: `Resident activity detected at ${clock(incident!.closed_at!)}. The alert ended on its own.` }
  return hasRoutineEvidence
    ? { variant: 'calm', Icon: CircleCheck, badge: STATUS_LABELS.routine, headline: `${R}’s routine looks normal`,
      reason: 'Activity detected at home within the usual routine.' }
    : { variant: 'pending', Icon: Clock3, badge: 'Awaiting routine activity', headline: 'Routine activity not confirmed yet',
      reason: 'No water or electricity use has been confirmed at home today.' }
}

interface Props {
  unit: Unit; ctx: Ctx; incident: Incident | null; feed: Notification[]; readings: Reading[]; now: number
  ackBusy: boolean; responseError: boolean; onCheckIn: () => void; onRequestVisit: () => void; onOpenIncident: () => void
}

export function HomeTab({ unit, ctx, incident, feed, readings, now, ackBusy, responseError, onCheckIn, onRequestVisit, onOpenIncident }: Props) {
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
  const checkingIn = incident?.events.some(event => event.type === 'caregiver_checking_in') ?? false
  const visitRequested = incident?.events.some(event => event.type === 'township_requested') ?? false
  const lastReadingAt = readings.at(-1)?.recorded_at
  const lastIncidentAt = incident?.events.at(-1)?.at
  const updatedAt = Math.max(new Date(unit.status_since).getTime(),
    ...(lastReadingAt ? [Date.parse(lastReadingAt)] : []),
    ...(lastIncidentAt ? [Date.parse(lastIncidentAt)] : []))
  const active = (reading: Reading) => reading.sensor === 'door' ? reading.value === 'open'
    : reading.sensor === 'water' ? Number(reading.value) > 0 : Number(reading.value) > unit.baseline.standby_power_kw
  const marks = (sensor: Reading['sensor']) => today.filter(reading => reading.sensor === sensor && active(reading)).map(reading => reading.recorded_at)
  const waterMarks = marks('water')
  const doorMarks = marks('door')
  const lanes: Lane[] = [
    { key: 'water', Icon: Droplets, label: 'Water', value: waterAt ? 'Used today' : 'No use yet', time: waterAt ? clock(waterAt) : null,
      marks: waterMarks.length || !waterAt ? waterMarks : [waterAt] },
    { key: 'power', Icon: Zap, label: 'Electricity', value: unit.latest.power_kw > unit.baseline.standby_power_kw ? 'In use' : powerUsed ? 'Used today' : power ? 'Standby' : 'No use yet',
      time: powerUsed ? clock(powerUsed.recorded_at) : power ? clock(power.recorded_at) : null, marks: marks('electricity') },
    { key: 'door', Icon: DoorOpen, label: 'Front door', value: unit.status === 'possible_away' ? 'Possibly away' : doorMarks.length ? 'Opened today' : 'No outing indicated',
      time: unit.status === 'possible_away' && unit.latest.last_door_event_at ? clock(unit.latest.last_door_event_at) : doorMarks.length ? clock(doorMarks.at(-1)!) : null, marks: doorMarks },
  ]
  const events = [
    ...(waterAt && !water ? [{ at: waterAt, Icon: Droplets, title: 'Water used at home' }] : []),
    ...today.filter(active).map(reading => ({
      at: reading.recorded_at,
      Icon: reading.sensor === 'water' ? Droplets : reading.sensor === 'electricity' ? Zap : DoorOpen,
      title: reading.sensor === 'water' ? 'Water used at home' : reading.sensor === 'electricity' ? 'Electricity used at home' : 'Front door opened',
    })),
    ...(morning && !waterAt && !powerUsed ? [{ at: morning.created_at, Icon: Sunrise, title: `${R}’s day has started`, detail: notificationCopy(morning, ctx, null).body }] : []),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)
  const nowAt = dayFraction(now)

  return <div className="cg-page cg-home">
    <header className="cg-intro">
      <p className="cg-eyebrow"><time dateTime={new Date(now).toISOString()}>{dayLabel(now)}</time><span aria-hidden="true">·</span>{clock(now)}</p>
      <h1 className="cg-display">{greeting(now)},<br /><em>{ctx.me.split(' ')[0]}.</em></h1>
    </header>

    <section aria-label="Current status" className={`cg-status is-${card.variant}`}>
      <span className="cg-orb" aria-hidden="true"><span /><span /><span /></span>
      <div className="cg-status-top">
        <span className="cg-status-badge"><card.Icon size={14} strokeWidth={2.4} aria-hidden="true" />{card.badge}</span>
      </div>
      <h2 className="cg-status-headline">{card.headline}</h2>
      <p className="cg-status-reason">{card.reason}</p>
      {card.grace && <p className="cg-status-meta"><span className="cg-status-timer cg-num">{card.grace}</span>
        <span>left in the simulated call window. You’ll only be alerted if {R} doesn’t answer.</span></p>}
      {card.ack && <div className="cg-status-actions">
        {!checkingIn && <button type="button" className="cg-btn cg-btn-inverse cg-btn-tall" onClick={onCheckIn} disabled={ackBusy}>I’ll check in with {R}</button>}
        {!visitRequested && <button type="button" className="cg-btn cg-btn-outline cg-btn-tall" onClick={onRequestVisit} disabled={ackBusy}>Ask township to visit</button>}
        {checkingIn && <p role="status">Check-in recorded. Safety is not yet confirmed.</p>}
        {visitRequested && <p role="status">Township visit requested.</p>}
        {(checkingIn || visitRequested) && <button type="button" className="cg-status-details" onClick={onOpenIncident}>View alert details</button>}
        {responseError && <p role="alert">Couldn’t record your response. Please try again.</p>}
      </div>}
      {card.open && <button type="button" className="cg-btn cg-btn-ghost" onClick={onOpenIncident}>{card.open}<ArrowRight size={18} aria-hidden="true" /></button>}
      <p className="cg-status-who"><span className="cg-status-name">{R}</span><span>{unit.resident_name} · {unit.unit_id}</span>
        <span className="cg-status-updated">{when(updatedAt, now)}</span></p>
    </section>

    <section className="cg-day" aria-labelledby="cg-day-heading">
      <div className="cg-section-head">
        <h2 id="cg-day-heading" className="cg-section-title">{R}’s day</h2>
        <span className="cg-section-note">Water, power &amp; door only</span>
      </div>
      <div className="cg-day-card" style={{ '--now': nowAt } as CSSProperties}>
      <ul className="cg-lanes">
        {lanes.map(lane => <li key={lane.key} className={`cg-lane is-${lane.key}`}>
          <span className="cg-lane-icon"><lane.Icon size={17} aria-hidden="true" /></span>
          <span className="cg-lane-label">{lane.label}</span>
          <span className="cg-lane-value"><strong>{lane.value}</strong>{lane.time && <time className="cg-num">{lane.time}</time>}</span>
          <span className="cg-lane-track" aria-hidden="true">
            <span className="cg-lane-past" />
            {lane.marks.map((at, index) => <i key={`${at}-${index}`} style={{ left: `${dayFraction(at) * 100}%`, animationDelay: `${300 + index * 40}ms` }} />)}
          </span>
        </li>)}
      </ul>
      <div className="cg-axis" aria-hidden="true">
        {['12a', '6a', '12p', '6p', '12a'].map((label, index) => <span key={index} className={Math.abs(index / 4 - nowAt) < .08 ? 'is-hidden' : ''}>{label}</span>)}
        <b>Now</b>
      </div>
      </div>
    </section>

    <section className="cg-recent" aria-labelledby="cg-recent-heading">
      <div className="cg-section-head"><h2 id="cg-recent-heading" className="cg-section-title">Today’s activity</h2></div>
      {events.length ? <ol className="cg-recent-list">
        {events.map((event, index) => <li key={`${event.at}-${event.title}-${index}`} className="cg-recent-event">
          <span className="cg-recent-icon"><event.Icon size={18} aria-hidden="true" /></span>
          <span className="cg-recent-text"><strong>{event.title}</strong>
            {'detail' in event && <span className="cg-recent-detail">{event.detail}</span>}</span>
          <time className="cg-num" dateTime={event.at}>{clock(event.at)}</time>
        </li>)}
      </ol> : <div className="cg-recent-list"><div className="cg-recent-event">
        <span className="cg-recent-icon"><Clock3 size={18} aria-hidden="true" /></span>
        <span className="cg-recent-text"><strong>No activity detected yet today</strong></span>
      </div></div>}
    </section>
  </div>
}

interface Lane { key: string; Icon: LucideIcon; label: string; value: string; time: string | null; marks: string[] }
