import { useState } from 'react'
import { BellRing, Check, ChevronLeft, CircleCheck, Info, ShieldCheck, TriangleAlert } from 'lucide-react'
import { api } from '../api'
import { applyIncident } from '../api/store'
import type { Incident, Outcome, Unit } from '../api/types'
import { actorName, eventCopy, GUARD, isOuting, OUTCOMES, outcomeLabel, STATUS_LABELS, type Ctx } from './copy'
import { clock, initials, until } from './format'

export type AckError = { kind: 'taken'; name: string | null } | { kind: 'failed' } | null
type Pick = Exclude<Outcome, 'resident_activity_detected'>

interface Props {
  incident: Incident; unit: Unit; ctx: Ctx; now: number; liveNote: boolean
  ackBusy: boolean; ackError: AckError; onAck: () => void; onBack: () => void
}

export function IncidentView({ incident, unit, ctx, now, liveNote, ackBusy, ackError, onAck, onBack }: Props) {
  const { R } = ctx
  const [outcome, setOutcome] = useState<Pick | null>(null)
  const [closing, setClosing] = useState(false)
  const [closeFailed, setCloseFailed] = useState(false)
  const state = incident.state
  const ack = incident.acknowledged_by
  const mine = ack?.role === 'caregiver' && ack.name === ctx.me
  const lastWater = unit.quiet_gap.last_water_activity_at
  const cause = isOuting(incident) ? `${R} has been out longer than usual.` : lastWater ? `No water use since ${clock(lastWater)}, longer than the usual gap.` : 'No water use for longer than the usual gap.'

  const hero = state === 'notified'
    ? { variant: 'alarm', chip: 'Needs response', Icon: TriangleAlert, badge: STATUS_LABELS[unit.status], title: `${R} didn’t answer`, body: `${cause} The simulated call to ${R} went unanswered.` }
    : state === 'acknowledged'
      ? { variant: 'checking', chip: 'Awaiting outcome', Icon: ShieldCheck, badge: 'Someone is checking', title: mine ? 'You’re checking' : `${actorName(ctx, ack)} is checking`,
        body: `${actorName(ctx, ack)} took this at ${ack ? clock(ack.at) : '—'}. Reminders have stopped for everyone. ${R} is not yet confirmed safe.` }
      : state === 'closed'
        ? { variant: 'calm', chip: 'Closed', Icon: CircleCheck, badge: 'Incident closed', title: outcomeLabel(incident.outcome),
          body: `Recorded by ${actorName(ctx, ack, false)} at ${incident.closed_at ? clock(incident.closed_at) : '—'}.` }
        : { variant: 'calm', chip: 'Resolved', Icon: CircleCheck, badge: 'Resolved by activity', title: 'Resident activity detected',
          body: `Activity at home ended this alert at ${incident.closed_at ? clock(incident.closed_at) : '—'}. No in-person check was recorded.` }

  const responders = [
    { key: 'me', name: `You (${ctx.me})`, role: 'Family caregiver', initials: initials(ctx.me), mine: true },
    { key: 'guard', name: GUARD, role: 'Township guard', initials: initials(GUARD), mine: false },
  ].map(person => {
    const has = !!ack && (person.mine ? mine : !mine)
    return { ...person, has, state: has ? `Checking since ${clock(ack!.at)}` : ack ? 'Stood down' : 'Alerted' }
  })

  async function record() {
    if (!outcome || closing) return
    setClosing(true)
    setCloseFailed(false)
    try { applyIncident(await api.closeIncident(incident.incident_id, { role: 'caregiver', name: ctx.me, outcome })) }
    catch { setCloseFailed(true) }
    finally { setClosing(false) }
  }

  return <div className="cg-sheet" role="dialog" aria-label="Safety alert">
    <div className="cg-sheet-head">
      <button type="button" className="cg-round" onClick={onBack} aria-label="Back"><ChevronLeft size={22} aria-hidden="true" /></button>
      <strong>Safety alert</strong>
      <span className="cg-chip">{hero.chip}</span>
    </div>
    <div className="cg-sheet-body">
      {liveNote && <div className="cg-live-note" role="status"><Info size={18} aria-hidden="true" />Updated just now: activity was detected at home.</div>}

      <section className={`cg-hero is-${hero.variant}`}>
        <span className="cg-badge"><hero.Icon size={16} aria-hidden="true" /><span>{hero.badge}</span></span>
        <h1 className="cg-display">{hero.title}</h1>
        <p>{hero.body}</p>
        {state === 'notified' && <p className="cg-hero-reminder"><BellRing size={16} aria-hidden="true" />
          <span>{incident.reminder_count ? `Reminder #${incident.reminder_count} sent` : 'Alert sent'} · next in <span className="cg-num">{until(incident.next_reminder_at, now)}</span></span>
        </p>}
        {state === 'notified' && <>
          <button type="button" className="cg-btn cg-btn-inverse cg-btn-tall" onClick={onAck} disabled={ackBusy}>
            {!ackBusy && <ShieldCheck size={22} aria-hidden="true" />}{ackBusy ? 'Recording…' : 'I’ll Check Now'}
          </button>
          <p className="cg-hero-note">Reminders stop for everyone once someone taps.</p>
        </>}
      </section>

      {ackError?.kind === 'taken' && state !== 'notified' && <div className="cg-notice" role="alert"><Info size={18} aria-hidden="true" />
        {ackError.name ? <span><strong>{ackError.name} is already handling this.</strong> Your tap arrived just after theirs, so it wasn’t recorded. You don’t need to do anything else.</span>
          : <span><strong>This alert changed before your tap arrived.</strong> The latest status is shown here.</span>}
      </div>}
      {ackError?.kind === 'failed' && <div className="cg-warning" role="alert"><Info size={18} aria-hidden="true" /><span>Your response couldn’t be recorded. Check your connection and try again.</span></div>}

      {(state === 'notified' || state === 'acknowledged') && <section className="cg-responders">
        {responders.map(person => <div key={person.key} className={`cg-responder ${person.has ? 'is-checking' : ack ? 'is-stood-down' : 'is-alerted'}`}>
          <span className="cg-responder-initials">{person.initials}</span>
          <span className="cg-responder-who"><strong>{person.name}</strong><span>{person.role}</span></span>
          <span className="cg-responder-state">{person.has ? <ShieldCheck size={14} aria-hidden="true" /> : <BellRing size={14} aria-hidden="true" />}{person.state}</span>
        </div>)}
      </section>}

      {state === 'acknowledged' && mine && <section className="cg-card">
        <h2 className="cg-card-title">What did you find?</h2>
        <p className="cg-card-lead">Recording an outcome closes the incident for you and {GUARD}.</p>
        <div role="radiogroup" aria-label="Outcome" className="cg-outcomes">
          {OUTCOMES.map(item => <button key={item.value} type="button" role="radio" aria-checked={outcome === item.value}
            className={`cg-outcome ${outcome === item.value ? 'is-on' : ''}`} onClick={() => setOutcome(item.value)}>
            <span className="cg-outcome-dot">{outcome === item.value && <Check size={14} aria-hidden="true" />}</span>
            <span><strong>{item.label}</strong><span>{item.help}</span></span>
          </button>)}
        </div>
        {closeFailed && <p className="cg-inline-error" role="alert"><Info size={16} aria-hidden="true" />The outcome couldn’t be recorded. Please try again.</p>}
        <button type="button" className="cg-btn cg-btn-accent cg-record" onClick={() => void record()} disabled={!outcome || closing}>{closing ? 'Recording…' : 'Record outcome'}</button>
      </section>}

      {state === 'acknowledged' && !mine && <p className="cg-fineprint cg-pad">Only {actorName(ctx, ack)} can record the outcome. You’ll get an update here when it’s recorded.</p>}

      <section className="cg-card">
        <h2 className="cg-card-title">Timeline</h2>
        <ol className="cg-timeline">
          {incident.events.map((event, index) => {
            const copy = eventCopy(event, ctx, incident)
            return <li key={`${event.at}-${event.type}-${index}`}>
              <span className={`cg-tone-icon tone-${copy.tone}`}><copy.Icon size={18} aria-hidden="true" /></span>
              <span><strong>{copy.title}</strong><span>{copy.body}</span><time dateTime={event.at}>{clock(event.at, true)}</time></span>
            </li>
          })}
        </ol>
      </section>
    </div>
  </div>
}
