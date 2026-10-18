import { useEffect, useState } from 'react'
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

export function IncidentPanel({ incident, unit, role }: { incident: Incident | null; unit: Unit; role: Role }) {
  const [clock, setClock] = useState(() => Date.now())
  const [outcome, setOutcome] = useState<Exclude<Outcome, 'resident_activity_detected'>>('resident_ok')
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
  return <section className={`incident-panel incident-${incident.state}`} aria-label="Incident response">
    <div className="incident-panel-head"><h4>Incident response</h4><span className={`incident-state ${resolved ? 'calm' : ''}`}>{statusText}</span></div>
    {incident.state === 'grace' && <p className="incident-lead">A possible break in routine was detected. A simulated voice call is being made before anyone is alerted.</p>}
    {incident.state === 'notified' && <p className="incident-lead urgent">Mum did not answer. Caregiver and township have both been alerted.</p>}
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

    {(incident.state === 'grace' || incident.state === 'notified') && <AcknowledgeButton incident={incident} unit={unit} role={role} />}
    {canClose && <div className="emergency-handoff">
      <strong>Emergency handoff</strong>
      <p>If the resident has collapsed or needs urgent help, call 999 immediately and request an ambulance. Give the operator the address, building, unit and access details. Follow the operator’s instructions.</p>
      <p>Unit: <strong>{unit.unit_id}</strong>. Confirm the full site address and access route before the call.</p>
      <a className="primary-action" href="tel:999">Call 999</a>
      {!called && <button type="button" disabled={busy} onClick={() => void escalate('emergency_called')}>I called 999 — record handoff</button>}
      {!unable && !called && <button type="button" disabled={busy} onClick={() => void escalate('unable_to_verify')}>Unable to verify safety</button>}
      {called && <p role="status">999 call reported. Record the eventual outcome only after the handoff or welfare check is confirmed.</p>}
      {error && <p className="action-error" role="alert">{error}</p>}
    </div>}
    {canClose && <form className="outcome-form" onSubmit={event => { event.preventDefault(); void close() }}>
      <label htmlFor={`outcome-${role}`}>What happened?</label>
      <div className="outcome-controls">
        <select id={`outcome-${role}`} value={outcome} onChange={event => setOutcome(event.target.value as Exclude<Outcome, 'resident_activity_detected'>)}>
          {outcomes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>
      {role === 'township' && <>
        <label htmlFor={`report-${incident.incident_id}`}>Short report</label>
        <textarea id={`report-${incident.incident_id}`} value={report} onChange={event => setReport(event.target.value)}
          required maxLength={500} rows={3} placeholder="Describe what you found and what action was taken." />
      </>}
      <button type="submit" className="primary-action" disabled={busy || (role === 'township' && !report.trim())}>{busy ? 'Recording…' : 'Record outcome and close'}</button>
      {error && <p className="action-error" role="alert">{error}</p>}
    </form>}
    {incident.state === 'acknowledged' && !canClose && <p className="incident-hint">{incident.acknowledged_by?.name} will log the outcome.</p>}
  </section>
}
