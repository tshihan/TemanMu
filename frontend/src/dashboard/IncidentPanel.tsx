import { useEffect, useState } from 'react'
import { BellRing, ChevronDown, ChevronUp, CircleCheck, Droplets, PhoneMissed, PhoneOutgoing, ShieldCheck, XCircle } from 'lucide-react'
import seed from '../../../shared/seed.json'
import { api } from '../api'
import { ApiError } from '../api/live'
import { applyEvent } from '../api/store'
import type { Incident, Outcome, Role, Unit } from '../api/types'

const outcomes: { value: Exclude<Outcome, 'resident_activity_detected'>; label: string }[] = [
  { value: 'resident_ok', label: 'Resident OK' },
  { value: 'assistance_provided', label: 'Assistance provided' },
  { value: 'resident_away', label: 'Resident was away' },
]

function actorName(role: Role, unit: Unit): string {
  return role === 'caregiver' ? unit.caregiver_name : seed.responders.township
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso))
}

function countdown(deadline: string | null, current: number): string {
  if (!deadline) return '—'
  const seconds = Math.max(0, Math.ceil((new Date(deadline).getTime() - current) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function actionError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) return 'This incident changed before your action. Review the latest status and try again if needed.'
  if (error instanceof ApiError && error.status === 403) return 'Only the person who acknowledged this incident can close it.'
  return error instanceof Error ? error.message : 'The action could not be completed.'
}

async function refreshIncident(id: string): Promise<void> {
  try {
    const latest = await api.getIncident(id)
    applyEvent({ type: 'incident.updated', at: new Date().toISOString(), data: latest })
  } catch { /* The original action error remains visible. */ }
}

export function AcknowledgeButton({ incident, unit, role }: { incident: Incident; unit: Unit; role: Role }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!['grace', 'notified'].includes(incident.state)) return null

  async function acknowledge() {
    setBusy(true)
    setError(null)
    try { await api.acknowledgeIncident(incident.incident_id, { role, name: actorName(role, unit) }) }
    catch (cause) { setError(actionError(cause)); await refreshIncident(incident.incident_id) }
    finally { setBusy(false) }
  }

  return <div className="incident-action">
    <button type="button" className="primary-action" disabled={busy} onClick={() => void acknowledge()}>{busy ? 'Recording…' : "I'll Check Now"}</button>
    {error && <p className="action-error" role="alert">{error}</p>}
  </div>
}

export function IncidentPanel({ incident, unit, role, variant = 'default' }: { incident: Incident | null; unit: Unit; role: Role; variant?: 'default' | 'caregiver' }) {
  const [clock, setClock] = useState(() => Date.now())
  const [expanded, setExpanded] = useState(false)
  const [outcome, setOutcome] = useState<Exclude<Outcome, 'resident_activity_detected'>>('resident_ok')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!incident || !['grace', 'notified'].includes(incident.state)) return
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [incident])

  async function close() {
    if (!incident) return
    setBusy(true)
    setError(null)
    try { await api.closeIncident(incident.incident_id, { role, name: actorName(role, unit), outcome }) }
    catch (cause) { setError(actionError(cause)); await refreshIncident(incident.incident_id) }
    finally { setBusy(false) }
  }

  if (!incident && variant === 'caregiver') return <section className="care-incident" aria-label="Incident activity"><h2>Incident activity</h2><p className="care-empty">No incident has been recorded for Mum.</p></section>
  if (!incident) return <section className="incident-panel" aria-label="Incident response">
    <div className="incident-panel-head"><h4>Incident response</h4><span className="incident-state calm">No active concern</span></div>
    <p className="incident-empty">No safety incident has been recorded for this home.</p>
  </section>

  const canClose = incident.state === 'acknowledged' && incident.acknowledged_by?.role === role && incident.acknowledged_by.name === actorName(role, unit)
  const resolved = incident.state === 'closed' || incident.state === 'auto_resolved'
  const statusText = incident.state === 'grace' ? 'Checking quietly' : incident.state === 'notified' ? 'Needs response' : incident.state === 'acknowledged' ? 'Someone is checking' : 'Resolved'
  if (variant === 'caregiver') {
    const eventDetails = incident.events.map((event, index) => {
      const name = event.actor?.name || incident.acknowledged_by?.name || 'A responder'
      const detail = event.type === 'detected' ? { title: 'Unusual water inactivity', description: 'No water activity within the expected window.', Icon: Droplets, tone: 'info' }
        : event.type === 'voice_call_started' ? { title: 'Automatic call started', description: 'TemanMu attempted to call Mum.', Icon: PhoneOutgoing, tone: 'info' }
        : event.type === 'voice_call_no_answer' ? { title: 'No answer', description: 'Mum did not answer the call.', Icon: PhoneMissed, tone: 'attention' }
        : event.type === 'voice_call_cancelled' ? { title: 'Call stopped', description: 'The automatic call was stopped.', Icon: XCircle, tone: 'info' }
        : event.type === 'notified' ? { title: 'Alert sent', description: 'Caregiver and township were notified.', Icon: BellRing, tone: 'attention' }
        : event.type === 'reminder' ? { title: 'Reminder sent', description: 'The care team received a follow-up alert.', Icon: BellRing, tone: 'attention' }
        : event.type === 'acknowledged' ? { title: 'Alert acknowledged', description: `${name} accepted the alert. Safety is not yet confirmed.`, Icon: ShieldCheck, tone: 'info' }
        : event.type === 'auto_resolved' ? { title: 'Activity detected', description: 'New activity at home ended the alert.', Icon: CircleCheck, tone: 'calm' }
        : { title: 'Outcome recorded', description: `${name} recorded the incident outcome.`, Icon: CircleCheck, tone: 'calm' }
      return { ...detail, event, index }
    })
    const visible = expanded ? eventDetails : eventDetails.slice(-2)
    return <section className="care-incident" aria-labelledby="incident-activity-heading">
      <div className="care-section-head"><h2 id="incident-activity-heading">Incident activity</h2><span>{incident.state === 'acknowledged' ? 'Awaiting outcome' : resolved ? 'Completed' : 'In progress'}</span></div>
      <ol className="care-event-list" aria-label="Incident events in chronological order">{visible.map(({ event, index, title, description, Icon, tone }) => <li key={`${event.at}-${event.type}-${index}`} className={`care-event-${tone}`}><span className="care-event-icon"><Icon size={19} aria-hidden="true" /></span><div><strong>{title}</strong><p>{description}</p><time dateTime={event.at}>{timeLabel(event.at)}</time></div></li>)}</ol>
      {eventDetails.length > 2 && <button type="button" className="care-timeline-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? <>Show less <ChevronUp size={17} /></> : <>View full timeline <ChevronDown size={17} /></>}</button>}
      {(incident.state === 'grace' || incident.state === 'notified') && <AcknowledgeButton incident={incident} unit={unit} role={role} />}
      {canClose && <form className="outcome-form" onSubmit={event => { event.preventDefault(); void close() }}><label htmlFor={`outcome-${role}`}>What happened?</label><div className="outcome-controls"><select id={`outcome-${role}`} value={outcome} onChange={event => setOutcome(event.target.value as Exclude<Outcome, 'resident_activity_detected'>)}>{outcomes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button type="submit" className="primary-action" disabled={busy}>{busy ? 'Closing…' : 'Record outcome'}</button></div>{error && <p className="action-error" role="alert">{error}</p>}</form>}
      {incident.state === 'acknowledged' && !canClose && <p className="care-incident-note">{incident.acknowledged_by?.name} will record the outcome after checking.</p>}
    </section>
  }

  return <section className={`incident-panel incident-${incident.state}`} aria-label="Incident response">
    <div className="incident-panel-head"><h4>Incident response</h4><span className={`incident-state ${resolved ? 'calm' : ''}`}>{statusText}</span></div>
    {incident.state === 'grace' && <p className="incident-lead">A possible break in routine was detected. A simulated voice call is being made before anyone is alerted.</p>}
    {incident.state === 'notified' && <p className="incident-lead urgent">Mum did not answer. Caregiver and township have both been alerted.</p>}
    {incident.state === 'acknowledged' && <p className="incident-lead">{incident.acknowledged_by?.name} ({incident.acknowledged_by?.role}) acknowledged at {incident.acknowledged_by ? timeLabel(incident.acknowledged_by.at) : '—'}. Reminders have stopped.</p>}
    {resolved && <p className="incident-lead">Outcome: {incident.outcome === 'resident_activity_detected' ? 'Resident activity detected' : outcomes.find(item => item.value === incident.outcome)?.label || 'Resolved'}{incident.acknowledged_by ? ` · Checked by ${incident.acknowledged_by.name}` : ''}.</p>}

    {incident.state === 'grace' && <div className="incident-count"><span>Grace period remaining</span><strong>{countdown(incident.grace_ends_at, clock)}</strong></div>}
    {incident.state === 'notified' && <div className="incident-count"><span>Reminder #{incident.reminder_count + 1} in</span><strong>{countdown(incident.next_reminder_at, clock)}</strong></div>}

    <ol className="response-timeline" aria-label="Incident timeline">
      {incident.events.map((event, index) => <li key={`${event.at}-${event.type}-${index}`}>
        <time dateTime={event.at}>{timeLabel(event.at)}</time>
        <span>{event.type.replaceAll('_', ' ')}{event.detail ? ` · ${event.detail}` : ''}{event.actor ? ` · ${event.actor.name}` : ''}</span>
      </li>)}
    </ol>

    {(incident.state === 'grace' || incident.state === 'notified') && <AcknowledgeButton incident={incident} unit={unit} role={role} />}
    {canClose && <form className="outcome-form" onSubmit={event => { event.preventDefault(); void close() }}>
      <label htmlFor={`outcome-${role}`}>What happened?</label>
      <div className="outcome-controls">
        <select id={`outcome-${role}`} value={outcome} onChange={event => setOutcome(event.target.value as Exclude<Outcome, 'resident_activity_detected'>)}>
          {outcomes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <button type="submit" className="primary-action" disabled={busy}>{busy ? 'Closing…' : 'Close incident'}</button>
      </div>
      {error && <p className="action-error" role="alert">{error}</p>}
    </form>}
    {incident.state === 'acknowledged' && !canClose && <p className="incident-hint">{incident.acknowledged_by?.name} will log the outcome.</p>}
  </section>
}
