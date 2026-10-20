import { useEffect, useState } from 'react'
import seed from '../../../shared/seed.json'
import { api } from '../api'
import { ApiError } from '../api/live'
import { applyEvent } from '../api/store'
import type { Incident, Outcome, Role, Unit } from '../api/types'

const outcomes: { value: Exclude<Outcome, 'resident_activity_detected'>; label: string }[] = [
  { value: 'resident_ok', label: 'Resident OK' },
  { value: 'assistance_provided', label: 'Assistance provided' },
  { value: 'sent_to_hospital', label: 'Sent to hospital' },
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

function clockLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
}

function countdown(deadline: string | null, current: number): string {
  if (!deadline) return '—'
  const seconds = Math.max(0, Math.ceil((new Date(deadline).getTime() - current) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function actionError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) return 'This incident changed before your action. Review the latest status and try again if needed.'
  if (error instanceof ApiError && error.status === 403) return 'Only the person who acknowledged this incident can record this action.'
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
  if (incident.state !== 'notified') return null

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

type CloseOutcome = Exclude<Outcome, 'resident_activity_detected'>

/** The township responder's at-the-door screen: record the outcome; 999 stays one tap away. */
function TownshipCheck({ incident, unit }: { incident: Incident; unit: Unit }) {
  const [picked, setPicked] = useState<CloseOutcome | ''>('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const actor = { role: 'township' as const, name: actorName('township', unit) }
  const unable = incident.events.some(event => event.type === 'unable_to_verify')
  const calledAt = incident.events.find(event => event.type === 'emergency_called')?.at
  // The backend closes an unverified check only as Resident OK until a 999 call is recorded.
  const allowed = (value: CloseOutcome) => !unable || !!calledAt || value === 'resident_ok'
  const outcome = picked && allowed(picked) ? picked : ''

  async function escalate(action: 'unable_to_verify' | 'emergency_called') {
    setMoreOpen(false)
    setBusy(true)
    setError(null)
    try { applyEvent({ type: 'incident.updated', at: new Date().toISOString(), data: await api.escalateIncident(incident.incident_id, { ...actor, action }) }) }
    catch (cause) { setError(actionError(cause)); await refreshIncident(incident.incident_id) }
    finally { setBusy(false) }
  }

  async function submit() {
    if (!outcome) return
    setBusy(true)
    setError(null)
    // The backend requires a township report; the outcome label stands in when no note is added.
    const report = note.trim() || outcomes.find(item => item.value === outcome)!.label
    try { applyEvent({ type: 'incident.updated', at: new Date().toISOString(), data: await api.closeIncident(incident.incident_id, { ...actor, outcome, report }) }) }
    catch (cause) { setError(actionError(cause)); await refreshIncident(incident.incident_id) }
    finally { setBusy(false) }
  }

  return <section className="ir" aria-label="Incident response">
    <div className="ir-status">
      <span>You're checking · reminders off</span>
      {incident.acknowledged_by && <time dateTime={incident.acknowledged_by.at}>since {clockLabel(incident.acknowledged_by.at)}</time>}
    </div>
    {calledAt && <p className="ir-banner" role="status">999 call recorded at {clockLabel(calledAt)}. Keep this open until you know the outcome.</p>}
    {unable && !calledAt && <p className="ir-banner" role="status">Safety not verified. Contact the duty supervisor and caregiver.</p>}

    <form onSubmit={event => { event.preventDefault(); void submit() }} noValidate>
      <h3 className="ir-title" id={`ir-outcome-${incident.incident_id}`}>Check outcome</h3>
      <div className="ir-options" role="group" aria-labelledby={`ir-outcome-${incident.incident_id}`}>
        {outcomes.map(item => <button key={item.value} type="button" className="ir-option" aria-pressed={outcome === item.value}
          disabled={busy || !allowed(item.value)} onClick={() => setPicked(item.value)}>
          <span className="ir-option-dot" aria-hidden="true" /><span>{item.label}</span>
        </button>)}
      </div>
      {unable && !calledAt && <p className="ir-hint">Record a 999 call to choose another outcome.</p>}
      {noteOpen
        ? <textarea className="ir-note" rows={2} maxLength={500} aria-label="Note" placeholder="Anything the caregiver should know"
            value={note} onChange={event => setNote(event.target.value)} autoFocus />
        : <button type="button" className="ir-add-note" onClick={() => setNoteOpen(true)}>+ Add a note (optional)</button>}
      <button type="submit" className="ir-submit" disabled={busy || !outcome}>{busy ? 'Recording…' : outcome ? 'Submit' : 'Select an outcome'}</button>
      {error && <p className="ir-error" role="alert">{error}</p>}
    </form>

    <div className="ir-emergency">
      <div className="ir-emergency-row">
        <span>Emergency? Give unit {unit.unit_id}, Block A, and the access route.</span>
        <a className="ir-call" href="tel:999">Call 999</a>
        {!calledAt && <button type="button" className="ir-pill" aria-expanded={moreOpen}
          onClick={() => setMoreOpen(open => !open)}>{moreOpen ? 'Less' : 'More'}</button>}
      </div>
      {moreOpen && <div className="ir-more">
        {!calledAt && <button type="button" className="ir-pill" disabled={busy} onClick={() => void escalate('emergency_called')}>I called 999, record it</button>}
        {!unable && !calledAt && <button type="button" className="ir-pill" disabled={busy} onClick={() => void escalate('unable_to_verify')}>I can't verify safety</button>}
      </div>}
    </div>
  </section>
}

/** Confirmation after the incident ends, kept on screen until the responder dismisses it. */
function TownshipDone({ incident, onDone }: { incident: Incident; onDone: () => void }) {
  const closer = incident.events.find(event => event.type === 'closed')?.actor
  const label = incident.outcome === 'resident_activity_detected' ? 'Resident activity detected'
    : outcomes.find(item => item.value === incident.outcome)?.label ?? 'Resolved'
  return <section className="ir-done" aria-label="Incident closed">
    <span>Closed{incident.closed_at ? ` · ${clockLabel(incident.closed_at)}` : ''}</span>
    <h3>{label}</h3>
    <p>{closer ? `Recorded by ${closer.name}.` : 'Closed automatically after activity was detected.'} The caregiver has been told.</p>
    <button type="button" onClick={onDone} autoFocus>Done</button>
  </section>
}

export function IncidentPanel({ incident, unit, role, onDone }: { incident: Incident | null; unit: Unit; role: Role; onDone?: () => void }) {
  const [clock, setClock] = useState(() => Date.now())
  const [outcome, setOutcome] = useState<Exclude<Outcome, 'resident_activity_detected'> | ''>('')
  const [report, setReport] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function escalate(action: 'unable_to_verify' | 'emergency_called') {
    if (!incident) return
    setBusy(true)
    setError(null)
    try { applyEvent({ type: 'incident.updated', at: new Date().toISOString(), data: await api.escalateIncident(incident.incident_id, { role, name: actorName(role, unit), action }) }) }
    catch (cause) { setError(actionError(cause)); await refreshIncident(incident.incident_id) }
    finally { setBusy(false) }
  }

  useEffect(() => {
    if (!incident || !['grace', 'notified'].includes(incident.state)) return
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [incident])

  async function close() {
    if (!incident) return
    if (!outcome) {
      setError('Select a confirmed outcome before closing the incident.')
      return
    }
    if (role === 'township' && !report.trim()) {
      setError('Add a short description before closing the incident.')
      return
    }
    setBusy(true)
    setError(null)
    try { await api.closeIncident(incident.incident_id, { role, name: actorName(role, unit), outcome, ...(role === 'township' ? { report: report.trim() } : {}) }) }
    catch (cause) { setError(actionError(cause)); await refreshIncident(incident.incident_id) }
    finally { setBusy(false) }
  }

  if (!incident) return <section className="incident-panel" aria-label="Incident response">
    <div className="incident-panel-head"><h4>Incident response</h4><span className="incident-state calm">No active concern</span></div>
    <p className="incident-empty">No safety incident has been recorded for this home.</p>
  </section>

  const canClose = incident.state === 'acknowledged' && incident.acknowledged_by?.role === role && incident.acknowledged_by.name === actorName(role, unit)
  const unable = incident.events.some(event => event.type === 'unable_to_verify')
  const called = incident.events.some(event => event.type === 'emergency_called')
  const resolved = incident.state === 'closed' || incident.state === 'auto_resolved'
  const statusText = incident.state === 'grace' ? 'Checking quietly' : incident.state === 'notified' ? 'Needs response' : incident.state === 'acknowledged' ? called ? '999 called' : unable ? 'Safety unverified' : 'Someone is checking' : 'Resolved'
  const detectedAt = incident.events.find(event => event.type === 'detected')?.at ?? incident.opened_at
  const notifiedAt = incident.events.find(event => event.type === 'notified')?.at
  const acknowledgedAt = incident.acknowledged_by?.at ?? incident.events.find(event => event.type === 'acknowledged')?.at
  const unableAt = incident.events.find(event => event.type === 'unable_to_verify')?.at
  const calledAt = incident.events.find(event => event.type === 'emergency_called')?.at
  const visitRequested = incident.events.some(event => event.type === 'township_requested')
  const caregiverCheckingIn = incident.events.some(event => event.type === 'caregiver_checking_in')
  if (role === 'township' && canClose) return <TownshipCheck incident={incident} unit={unit} />
  if (resolved && onDone) return <TownshipDone incident={incident} onDone={onDone} />
  return <section className={`incident-panel incident-${incident.state}`} aria-label="Incident response">
    <div className="incident-panel-head"><h4>Incident response</h4><span className={`incident-state ${resolved ? 'calm' : ''}`}>{statusText}</span></div>
    {incident.state === 'grace' && <p className="incident-lead">A possible break in routine was detected. A simulated voice call is being made before anyone is alerted.</p>}
    {incident.state === 'notified' && <p className="incident-lead urgent">Resident {unit.unit_id} · {unit.resident_name} did not answer. Caregiver and township have been alerted.</p>}
    {visitRequested && incident.state === 'notified' && <p className="incident-lead urgent">Caregiver requested a township visit.</p>}
    {caregiverCheckingIn && incident.state === 'notified' && <p className="incident-lead">Caregiver is checking in remotely. Resident safety is not confirmed.</p>}
    {incident.state === 'acknowledged' && <p className="incident-lead">{incident.acknowledged_by?.name} is checking. Reminders have stopped.</p>}
    {unable && !called && !resolved && <p className="incident-lead urgent">Resident safety could not be verified. Contact the duty supervisor and caregiver urgently; call 999 if an emergency is suspected.</p>}
    {called && !resolved && <p className="incident-lead urgent">{incident.events.find(event => event.type === 'emergency_called')?.actor?.name} reports calling 999. Keep this case open and help responders reach the unit. Dispatch is not confirmed.</p>}
    {resolved && <p className="incident-lead">Outcome: {incident.outcome === 'resident_activity_detected' ? 'Resident activity detected' : outcomes.find(item => item.value === incident.outcome)?.label || 'Resolved'}{incident.acknowledged_by ? ` · Checked by ${incident.acknowledged_by.name}` : ''}.</p>}
    {resolved && incident.report && <p className="incident-report"><strong>Report</strong><span>{incident.report}</span></p>}

    {incident.state === 'grace' && <div className="incident-count"><span>Grace period remaining</span><strong>{countdown(incident.grace_ends_at, clock)}</strong></div>}
    {incident.state === 'notified' && <div className="incident-count"><span>Reminder #{incident.reminder_count + 1} in</span><strong>{countdown(incident.next_reminder_at, clock)}</strong></div>}

    <dl className="incident-milestones" aria-label="Incident summary">
      <div><dt>Inactivity detected</dt><dd><time dateTime={detectedAt}>{timeLabel(detectedAt)}</time></dd></div>
      <div><dt>Caregiver and township notified</dt><dd>{notifiedAt ? <time dateTime={notifiedAt}>{timeLabel(notifiedAt)}</time> : 'Pending'}</dd></div>
      <div><dt>Response acknowledged</dt><dd>{acknowledgedAt ? <time dateTime={acknowledgedAt}>{timeLabel(acknowledgedAt)}</time> : 'Pending'}</dd></div>
      {unableAt && <div><dt>Safety not verified</dt><dd><time dateTime={unableAt}>{timeLabel(unableAt)}</time></dd></div>}
      {calledAt && <div><dt>999 call reported</dt><dd><time dateTime={calledAt}>{timeLabel(calledAt)}</time></dd></div>}
    </dl>

    {incident.state === 'notified' && <AcknowledgeButton incident={incident} unit={unit} role={role} />}
    {canClose && <div className="emergency-handoff">
      <strong>Emergency handoff</strong>
      <ol>
        <li>Emergency? Call 999. Request an ambulance.</li>
        <li>Give the full address, unit {unit.unit_id}, and access route.</li>
        <li>Follow the operator’s instructions. Guide responders in.</li>
      </ol>
      <a className="primary-action" href="tel:999">Call 999</a>
      {!called && <button type="button" disabled={busy} onClick={() => void escalate('emergency_called')}>I called 999 — record call</button>}
      {!unable && !called && <button type="button" disabled={busy} onClick={() => void escalate('unable_to_verify')}>Unable to verify safety</button>}
      {called && <p role="status">999 call recorded. Keep open until the outcome is confirmed.</p>}
      {error && <p className="action-error" role="alert">{error}</p>}
    </div>}
    {canClose && <form className="outcome-form" onSubmit={event => { event.preventDefault(); void close() }}>
      <label htmlFor={`outcome-${role}`}>Confirmed outcome</label>
      <p className="outcome-hint">Choose this only after checking the resident. Recording the outcome closes the incident.</p>
      <div className="outcome-controls">
        <select id={`outcome-${role}`} value={outcome} onChange={event => setOutcome(event.target.value as Exclude<Outcome, 'resident_activity_detected'> | '')} required>
          <option value="">Select confirmed outcome</option>
          {outcomes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>
      {role === 'township' && <>
        <label htmlFor={`report-${incident.incident_id}`}>Short report</label>
        <textarea id={`report-${incident.incident_id}`} value={report} onChange={event => setReport(event.target.value)}
          required maxLength={500} rows={3} placeholder="Describe what you found and what action was taken." />
      </>}
      <button type="submit" className="primary-action" disabled={busy || !outcome || (role === 'township' && !report.trim())}>{busy ? 'Recording…' : 'Record outcome and close'}</button>
      {error && <p className="action-error" role="alert">{error}</p>}
    </form>}
    {incident.state === 'acknowledged' && !canClose && <p className="incident-hint">{incident.acknowledged_by?.name} will log the outcome.</p>}
  </section>
}
