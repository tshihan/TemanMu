import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, ChevronRight, CircleCheck, Clock3, DoorClosed, DoorOpen, Droplets, Hospital, Luggage, Phone, PhoneOutgoing, ShieldCheck, TriangleAlert, Volume2, VolumeX, Zap } from 'lucide-react'
import type { AccessEvent, AwayActivityResponse, AwayPeriod, Incident, Notification, Reading, Unit } from '../api/types'
import { AwayActivityChoices } from './AwayActivityChoices'
import { ResidentAvatar } from './Avatar'
import { actorName, cardConcern, currentAway, GUARD, isHomeCheck, isOuting, outcomeLabel, STATUS_LABELS, type Ctx } from './copy'
import { clock, dayFraction, dayLabel, isToday, when } from './format'
import { TrackingControl } from './TrackingControl'
import { hospitalGuard } from './hospital-transfer'

type Variant = 'alarm' | 'checking' | 'quiet' | 'away' | 'calm' | 'pending' | 'hospital'
interface Card { variant: Variant; Icon: LucideIcon; badge: string; headline: string; reason: string; grace?: boolean; ack?: boolean; open?: string }

function statusCard(unit: Unit, incident: Incident | null, ctx: Ctx, now: number, hasRoutineEvidence: boolean, away: AwayPeriod | null, awayReason: string | null, hospitalIncident: Incident | null): Card {
  const { R } = ctx
  const guard = hospitalGuard(hospitalIncident)
  const doorAt = unit.latest.last_door_event_at
  // Card homes: the family sees when she tapped out or in, never which gate.
  const tap = unit.outing_signal === 'card' ? unit.last_access : null
  const concern = cardConcern(incident)
  const cardCause = concern === 'not_back' ? `${R} tapped out${tap ? ` at ${clock(tap.at)}` : ''} and hasn’t come back`
    : concern === 'arrival' ? `${R} tapped back in${tap ? ` at ${clock(tap.at)}` : ''}, but there’s no activity at home` : null
  if (isHomeCheck(incident) && (incident?.state === 'notified' || incident?.state === 'acknowledged')) {
    const taken = incident.state === 'acknowledged' && incident.acknowledged_by
    return { variant: taken ? 'checking' : 'alarm', Icon: ShieldCheck, badge: 'Home check', open: 'View details',
      headline: taken ? `${actorName(ctx, incident.acknowledged_by)} is checking the home` : 'Home check requested',
      reason: taken ? `Taken at ${clock(incident.acknowledged_by!.at)}. You’ll get an update when the check is done.`
        : `You asked ${GUARD} to check the home. Waiting for them to take it.${incident.reminder_count ? ` Reminder #${incident.reminder_count}.` : ''}` }
  }
  if (incident?.state === 'notified') {
    const cause = cardCause ?? (isOuting(incident) ? `${R} has been out longer than usual` : 'No water use for longer than the usual gap')
    const reminder = incident.reminder_count ? ` Reminder #${incident.reminder_count}.` : ''
    const headline = concern === 'not_back' ? 'Not back yet' : concern === 'arrival' ? 'Tapped in, no activity at home' : 'Unusual inactivity'
    return { variant: 'alarm', Icon: TriangleAlert, badge: STATUS_LABELS[unit.status], headline, ack: true,
      reason: `${cause}. The call went unanswered. You and the township operator have been alerted.${reminder}` }
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
    const cause = cardCause ? `${cardCause}.` : isOuting(incident) && doorAt ? `${R} has been out since ${clock(doorAt)}, longer than usual.`
      : lastWater ? `No water use since ${clock(lastWater)}, longer than the usual gap.` : 'No water use for longer than the usual gap.'
    return { variant: 'quiet', Icon: PhoneOutgoing, badge: STATUS_LABELS.unusual_inactivity, headline: `Checking on ${R} quietly`,
      reason: `${cause} TemanMu is calling ${R} now.`, grace: incident?.state === 'grace' }
  }
  if (unit.care_state === 'in_hospital') return { variant: 'hospital', Icon: Hospital, badge: 'In hospital', headline: `${R} is in hospital`,
    reason: `${guard ? `${guard} recorded the hospital transfer.` : 'Hospital transfer recorded.'} Inactivity checks are paused until you confirm a return home. Water and power safety alerts remain active.` }
  if (away) return { variant: 'away', Icon: Luggage, badge: 'Tracking paused', headline: 'Monitoring paused',
    reason: `${awayReason ? `${awayReason.replace(/[.!]+$/, '')}. ` : ''}Until ${when(away.ends_at, now)}. Inactivity alerts are paused until then; you’ll still be alerted if water or power is left running.` }
  if (unit.status === 'possible_away' && tap?.direction === 'out') return { variant: 'away', Icon: DoorOpen, badge: STATUS_LABELS.possible_away, headline: `${R} went out`,
    reason: `${R} tapped out at ${clock(tap.at)}, then the home went quiet. An outing is likely, but ${R}’s safety isn’t confirmed. You can call ${R} to check.` }
  if (unit.status === 'possible_away') return { variant: 'away', Icon: DoorOpen, badge: STATUS_LABELS.possible_away, headline: `${R} may be out`,
    reason: `${doorAt ? `Door opened at ${clock(doorAt)}` : 'The door opened'}, then the home went quiet. An outing is possible, but not confirmed. You can call ${R} to check.` }

  if (unit.status === 'routine' && tap?.direction === 'in' && unit.awaiting_arrival_since)
    return { variant: 'calm', Icon: DoorOpen, badge: 'On the way home', headline: `${R} tapped back in`,
      reason: `${R} tapped in at ${clock(tap.at)}. TemanMu is waiting for activity at home to confirm ${R} is back.` }

  if (unit.status === 'routine' && unit.status_reason.startsWith(`${unit.caregiver_name} reports speaking directly`))
    return { variant: 'calm', Icon: CircleCheck, badge: 'Caregiver confirmed', headline: `${R} is home and okay`,
      reason: `You reported speaking directly with ${R}. This is your confirmation, not a sensor reading. Monitoring has restarted.` }

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
  unit: Unit; ctx: Ctx; incident: Incident | null; hospitalIncident: Incident | null; onOpenHospital: () => void; readings: Reading[]; taps: AccessEvent[]; now: number; awayReasons: Record<string, string | null>
  ackBusy: boolean; responseError: boolean; confirmBusy: boolean; confirmError: boolean
  muted: boolean; onToggleMute: () => void
  awayNotice: Notification | null; answerBusy: boolean; answerError: boolean
  onCheckIn: () => void; onRequestVisit: () => void; onOpenIncident: () => void; onCall: () => void; onConfirmHome: () => void
  onAnswerAway: (n: Notification, response: AwayActivityResponse) => void; onOpenHistory: () => void
}

export function HomeTab({ unit, ctx, incident, hospitalIncident, onOpenHospital, readings, taps, now, awayReasons, ackBusy, responseError, confirmBusy, confirmError, muted, onToggleMute, awayNotice, answerBusy, answerError,
  onCheckIn, onRequestVisit, onOpenIncident, onCall, onConfirmHome, onAnswerAway, onOpenHistory }: Props) {
  const { R } = ctx
  const today = readings.filter(reading => isToday(reading.recorded_at, now))
  const last = (match: (reading: Reading) => boolean) => [...today].reverse().find(match)
  const water = last(reading => reading.sensor === 'water' && Number(reading.value) > 0)
  const waterAt = water?.recorded_at ?? (unit.quiet_gap.last_water_activity_at && isToday(unit.quiet_gap.last_water_activity_at, now)
    ? unit.quiet_gap.last_water_activity_at : null)
  const power = last(reading => reading.sensor === 'electricity')
  const powerUsed = last(reading => reading.sensor === 'electricity' && Number(reading.value) > unit.baseline.standby_power_kw)
  const away = currentAway(unit, now)
  const card = statusCard(unit, incident, ctx, now, !!waterAt || !!powerUsed, away, away ? awayReasons[away.period_id] ?? null : null, hospitalIncident)
  const checkingIn = incident?.events.some(event => event.type === 'caregiver_checking_in') ?? false
  const trackingBlocked = !!unit.active_incident_id || !!(incident && !['closed', 'auto_resolved'].includes(incident.state))
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
  const powerMarks = marks('electricity')
  const paused = !!away || unit.care_state === 'in_hospital'
  const lastDoor = doorMarks.at(-1)
  const cardHome = unit.outing_signal === 'card'
  const tapsToday = taps.filter(tap => isToday(tap.at, now))
  const lastTap = cardHome ? unit.last_access : null
  const tiles: Tile[] = [
    { key: 'water', Icon: Droplets, value: waterAt ? clock(waterAt).replace(/\s?[AP]M$/, '') : '—', label: waterAt ? 'used' : 'no use yet' },
    { key: 'power', Icon: Zap, value: unit.latest.power_kw > unit.baseline.standby_power_kw ? 'In use' : powerUsed ? 'Used today' : 'Standby',
      label: powerUsed ? `${clock(powerUsed.recorded_at)}` : power ? `${clock(power.recorded_at)}` : 'no use yet' },
    unit.care_state === 'in_hospital' ? { key: 'door', Icon: DoorClosed, value: 'Hospital', label: 'in hospital' }
      : away ? { key: 'door', Icon: DoorOpen, value: 'Away', label: 'away period' }
      : cardHome && lastTap?.direction === 'out' ? { key: 'door', Icon: DoorOpen, value: 'Out', label: `since ${clock(lastTap.at)}` }
      : cardHome ? { key: 'door', Icon: DoorClosed, value: 'Home', label: lastTap?.direction === 'in' && isToday(lastTap.at, now) ? `back ${clock(lastTap.at)}` : 'no outing' }
      : unit.status === 'possible_away' ? { key: 'door', Icon: DoorOpen, value: 'Out?', label: `${unit.latest.last_door_event_at ? clock(unit.latest.last_door_event_at) : 'opened'}` }
      : { key: 'door', Icon: DoorClosed, value: 'Home', label: lastDoor ? `${clock(lastDoor)}` : 'no outing' },
  ]
  const tracks: { key: string; label: string; at: string[] }[] = [
    { key: 'water', label: 'Water', at: waterMarks.length || !waterAt ? waterMarks : [waterAt] },
    { key: 'power', label: 'Power', at: powerMarks },
    cardHome ? { key: 'door', label: 'Card', at: tapsToday.map(tap => tap.at) } : { key: 'door', label: 'Door', at: doorMarks },
  ]
  const nowAt = dayFraction(now)

  return <div className="cg-page cg-home">
    <header className="cg-home-head">
      <div className="cg-home-who">
        <ResidentAvatar name={unit.resident_name} size="md" />
        <div>
          <p className="cg-home-date"><time dateTime={new Date(now).toISOString()}>{dayLabel(now)}</time> · {clock(now)}</p>
          <h1 className="cg-large-title">{R}</h1>
        </div>
      </div>
      <div className="cg-home-tools">
        <button type="button" className="cg-icon-btn" onClick={onToggleMute}
          aria-label={muted ? 'Sounds off. Turn on' : 'Sounds on. Mute'} title={muted ? 'Sounds off. Turn on' : 'Sounds on. Mute'}>
          {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
        </button>
        <span className="cg-brand-mark" title="TemanMu"><Mark /></span>
      </div>
    </header>

    <section aria-label="Current status" className={`cg-status is-${card.variant}`}>
      <span className="cg-status-seal" aria-hidden="true"><card.Icon size={32} strokeWidth={2.4} /></span>
      <span className="cg-status-pill" role="status">{card.badge} · {when(card.variant === 'hospital' ? hospitalIncident?.hospital_sent_at ?? hospitalIncident?.closed_at ?? unit.status_since : updatedAt, now)}</span>
      <h2 className="cg-status-headline">{card.headline}</h2>
      <p className="cg-status-reason">{card.reason}</p>
      {card.variant === 'hospital' && <button type="button" className="cg-hospital-open" aria-label="View hospital transfer details" onClick={onOpenHospital}><span>View hospital details<ChevronRight size={18} aria-hidden="true" /></span></button>}
      {card.variant === 'hospital' && <div className="cg-status-actions cg-hospital-actions">
        <TrackingControl unit={unit} relationship={R} away={away} now={now} inCard blocked={trackingBlocked} />
      </div>}
      {card.grace && <p className="cg-status-grace"><PhoneOutgoing size={18} aria-hidden="true" />
        <span>Call in progress. You’ll only be alerted if {R} doesn’t answer.</span></p>}
      {unit.status === 'possible_away' && !away && <div className="cg-status-actions">
        <button type="button" className="cg-btn cg-btn-ink" onClick={onCall}><Phone size={18} aria-hidden="true" />Call {R}</button>
        <button type="button" className="cg-btn cg-btn-outline" onClick={onConfirmHome} disabled={confirmBusy}>
          {confirmBusy ? 'Recording confirmation…' : `I spoke to ${R} — home and okay`}
        </button>
        {confirmError && <p role="alert">Couldn’t record your confirmation. Please try again.</p>}
      </div>}
      {card.variant === 'away' && awayNotice && <div className="cg-status-actions">
        <p className="cg-status-ask"><strong>{awayNotice.message}</strong>Do you know who’s there?</p>
        <AwayActivityChoices ctx={ctx} busy={answerBusy} failed={answerError} onAnswer={response => onAnswerAway(awayNotice, response)} />
      </div>}
      {card.ack && <div className="cg-status-actions">
        {!checkingIn && <button type="button" className="cg-btn cg-btn-inverse cg-btn-tall" onClick={onCheckIn} disabled={ackBusy}>I’ll check in with {R}</button>}
        {!visitRequested && <button type="button" className="cg-btn cg-btn-shade cg-btn-tall" onClick={onRequestVisit} disabled={ackBusy}>Ask township to visit</button>}
        {checkingIn && <p className="cg-status-done" role="status"><CircleCheck size={20} aria-hidden="true" /><span><strong>Check-in recorded</strong>Safety is not yet confirmed.</span></p>}
        {visitRequested && <p className="cg-status-done" role="status"><CircleCheck size={20} aria-hidden="true" /><span><strong>Township visit requested</strong>Waiting for the township to take it.</span></p>}
        {(checkingIn || visitRequested) && <button type="button" className="cg-status-details" onClick={onOpenIncident}>View alert details</button>}
        {responseError && <p role="alert">Couldn’t record your response. Please try again.</p>}
      </div>}
      {card.open && <button type="button" className="cg-btn cg-btn-outline cg-status-open" onClick={onOpenIncident}>{card.open}<ArrowRight size={18} aria-hidden="true" /></button>}
    </section>

    <ul className={`cg-tiles ${paused ? 'is-paused' : ''}`} aria-label="Today at home">
      {tiles.map(tile => <li key={tile.key} className={`cg-tile is-${tile.key}`}>
        <span className="cg-tile-icon"><tile.Icon size={16} aria-hidden="true" /></span>
        <span className="cg-tile-text">
          <strong className={`cg-num ${tile.value.length > 7 ? 'is-long' : ''}`}>{tile.value}</strong>
          <span>{tile.label}</span>
        </span>
      </li>)}
    </ul>

    <section className="cg-day" aria-labelledby="cg-day-heading">
      <div className="cg-day-head">
        <h2 id="cg-day-heading">{R}’s day</h2>
        <span>{paused ? 'Tracking paused' : `Water, power & ${cardHome ? 'card taps' : 'door'} only`}</span>
      </div>
      <div className="cg-day-strip-chart" role="img" aria-label={tracks.map(track => `${track.label}: ${track.at.length ? track.at.map(at => clock(at)).join(', ') : 'none'}`).join('. ')}
        style={{ '--now': nowAt } as CSSProperties}>
        <span className="cg-day-past" />
        {tracks.map(track => track.at.map((at, index) => <i key={`${track.key}-${at}-${index}`} className={`is-${track.key}`} style={{ left: `${dayFraction(at) * 100}%` }} />))}
        <span className="cg-day-now" />
      </div>
      <div className="cg-axis" aria-hidden="true">{['12a', '6a', '12p', '6p', '12a'].map((label, index) => <span key={index}>{label}</span>)}</div>
      <div className="cg-legend" aria-hidden="true">{tracks.map(track => <span key={track.key} className={`is-${track.key}`}>{track.label}</span>)}</div>
      <button type="button" className="cg-day-history" onClick={onOpenHistory}>Past 7 days<ChevronRight size={18} aria-hidden="true" /></button>
    </section>

    <div className="cg-actions">
      <button type="button" className="cg-action is-ink" onClick={onCall}><Phone size={18} aria-hidden="true" />Call {R}</button>
      <TrackingControl unit={unit} relationship={R} away={away} now={now} blocked={trackingBlocked} />
    </div>
  </div>
}

interface Tile { key: string; Icon: LucideIcon; value: string; label: string }

function Mark() {
  return <svg width="24" height="24" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M14 29 L32 15 L50 29 V50 H14 Z" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinejoin="round" />
    <path d="M14 31 H50 M32 31 V50" stroke="currentColor" strokeWidth="3.6" />
    <rect x="35" y="34" width="12" height="13" fill="#f0b25a" />
  </svg>
}
