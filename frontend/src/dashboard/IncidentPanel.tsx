import { useEffect, useState } from 'react'
import { Check, ChevronDown, Phone, X } from 'lucide-react'
import seed from '../../../shared/seed.json'
import { api } from '../api'
import { ApiError } from '../api/live'
import { applyEvent } from '../api/store'
import type { Incident, Outcome, Unit } from '../api/types'
import { HOME_CHECK_OUTCOMES, isHomeCheck, outcomeLabel } from '../caregiver/copy'

type CloseOutcome = Exclude<Outcome, 'resident_activity_detected'>
type OutcomeOption = { value: CloseOutcome; label: string; help?: string }
const outcomes: OutcomeOption[] = [
  { value: 'resident_ok', label: 'Resident OK' },
  { value: 'assistance_provided', label: 'Assistance provided' },
  { value: 'sent_to_hospital', label: 'Sent to hospital' },
  { value: 'resident_away', label: 'Resident was away' },
]
// A home check during an away period records what was found at the home, not the resident's condition.
const outcomesFor = (incident: Incident): OutcomeOption[] => isHomeCheck(incident) ? HOME_CHECK_OUTCOMES : outcomes

const responder = seed.responders.township
const actor = { role: 'township' as const, name: responder }

function clockLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
}

function countdown(deadline: string | null, current: number): string {
  if (!deadline) return '–'
  const seconds = Math.max(0, Math.ceil((new Date(deadline).getTime() - current) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function actionError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) return 'This incident changed before your action. Check the latest status, then try again.'
  if (error instanceof ApiError && error.status === 403) return 'Only the person who said "I\'ll Check Now" can record this.'
  return error instanceof Error ? error.message : 'That did not go through. Try again.'
}

async function refreshIncident(id: string): Promise<void> {
  try {
    const latest = await api.getIncident(id)
    applyEvent({ type: 'incident.updated', at: new Date().toISOString(), data: latest })
  } catch { /* The original action error remains visible. */ }
}

const eventAt = (incident: Incident, type: Incident['events'][number]['type']) => incident.events.find(event => event.type === type)?.at

/** Why the guard is being asked, in the guard's words. The detected detail names what tripped the alert. */
export function alertReason(incident: Incident, unit: Unit): string {
  if (isHomeCheck(incident)) return `Activity at home while she is marked away. ${unit.caregiver_name} asked you to check the home`
  const detected = incident.events.find(event => event.type === 'detected')?.detail
  const why = detected === 'Outing longer than usual' ? 'She has been out longer than her usual outing'
    : detected === 'No water activity since confirmed contact' ? 'No water use since she was confirmed okay'
    : 'No water use for longer than her usual quiet gap'
  return `${why}, and she did not answer TemanMu's call`
}

/** Where the incident is on the response path: the same four steps in every state. */
function Steps({ incident }: { incident: Incident }) {
  const closedAt = incident.closed_at ?? eventAt(incident, 'closed') ?? eventAt(incident, 'auto_resolved')
  const steps = [
    { label: 'Detected', at: eventAt(incident, 'detected') ?? incident.opened_at },
    { label: 'Alerted', at: eventAt(incident, 'notified') },
    { label: 'Checking', at: incident.acknowledged_by?.at ?? eventAt(incident, 'acknowledged') },
    { label: 'Closed', at: closedAt ?? undefined },
  ]
  const current = steps.findIndex(step => !step.at)
  return <ol className="tm-steps" aria-label="Response progress">
    {steps.map((step, index) => <li key={step.label} className={step.at ? 'is-done' : index === current ? 'is-now' : ''}
      aria-current={index === current ? 'step' : undefined}>
      <span className="tm-step-mark" aria-hidden="true">{step.at && <Check size={11} strokeWidth={3} />}</span>
      <span className="tm-step-label">{step.label}</span>
      <time className="tm-step-time" dateTime={step.at}>{step.at ? clockLabel(step.at) : index === current ? 'Next' : '–'}</time>
    </li>)}
  </ol>
}

export function Acknowledge({ incident, className = 'tm-resp-primary' }: { incident: Incident; className?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function acknowledge() {
    setBusy(true)
    setError(null)
    try { await api.acknowledgeIncident(incident.incident_id, actor) }
    catch (cause) { setError(actionError(cause)); await refreshIncident(incident.incident_id) }
    finally { setBusy(false) }
  }
  return <>
    <button type="button" className={className} disabled={busy} onClick={() => void acknowledge()}>{busy ? 'Recording…' : "I'll Check Now"}</button>
    {error && <p className="tm-resp-error" role="alert">{error}</p>}
  </>
}

/** At the door: pick what was found. Recording it closes the incident. */
function OutcomeForm({ incident }: { incident: Incident }) {
  const [picked, setPicked] = useState<CloseOutcome | ''>('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [hospitalName, setHospitalName] = useState('')
  const [hospitalTime, setHospitalTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unable = incident.events.some(event => event.type === 'unable_to_verify')
  const called = !!eventAt(incident, 'emergency_called')
  const options = outcomesFor(incident)
  // The backend closes an unverified welfare check only as Resident OK until a 999 call is recorded.
  const allowed = (value: CloseOutcome) => isHomeCheck(incident) || !unable || called || value === 'resident_ok'
  const outcome = picked && allowed(picked) ? picked : ''
  const titleId = `tm-outcome-${incident.incident_id}`

  async function submit() {
    if (!outcome) return
    const sentAt = outcome === 'sent_to_hospital' && hospitalTime ? Date.parse(`${hospitalTime}+08:00`) : null
    if (sentAt !== null && (!Number.isFinite(sentAt) || sentAt > Date.now())) {
      setError('Choose a valid transfer time that is not in the future. Times are Malaysia time.')
      return
    }
    setBusy(true)
    setError(null)
    // The backend requires a township report; the outcome label stands in when no note is added.
    const report = note.trim() || options.find(item => item.value === outcome)!.label
    try { applyEvent({ type: 'incident.updated', at: new Date().toISOString(), data: await api.closeIncident(incident.incident_id, {
      ...actor, outcome, report,
      ...(outcome === 'sent_to_hospital' ? { hospital_name: hospitalName.trim() || null, hospital_sent_at: sentAt === null ? null : new Date(sentAt).toISOString() } : {}),
    }) }) }
    catch (cause) { setError(actionError(cause)); await refreshIncident(incident.incident_id) }
    finally { setBusy(false) }
  }

  return <form className="tm-outcome" onSubmit={event => { event.preventDefault(); void submit() }} noValidate>
    <h3 id={titleId}>{isHomeCheck(incident) ? 'What did you find at the home?' : 'What did you find?'}</h3>
    <div className="tm-outcome-options" role="radiogroup" aria-labelledby={titleId}>
      {options.map(item => <button key={item.value} type="button" role="radio" aria-checked={outcome === item.value}
        className="tm-outcome-option" disabled={busy || !allowed(item.value)} onClick={() => setPicked(item.value)}>
        <span className="tm-outcome-dot" aria-hidden="true" />
        <span className="tm-outcome-text"><span>{item.label}</span>{item.help && <small>{item.help}</small>}</span>
      </button>)}
    </div>
    {outcome === 'sent_to_hospital' && <div className="tm-hospital-fields">
      <label>Hospital name (if known)<input type="text" maxLength={200} value={hospitalName} onChange={event => setHospitalName(event.target.value)} disabled={busy} /></label>
      <label>Time sent to hospital (Malaysia time)<input type="datetime-local" value={hospitalTime} onChange={event => setHospitalTime(event.target.value)} disabled={busy} /></label>
      <p>Leave unknown details blank. The time you submit this record is saved separately.</p>
    </div>}
    {unable && !called && !isHomeCheck(incident) && <p className="tm-resp-hint">Record a 999 call to choose another outcome.</p>}
    {noteOpen
      ? <textarea className="tm-outcome-note" rows={2} maxLength={500} aria-label="Note for the caregiver" placeholder="Anything the caregiver should know"
          value={note} onChange={event => setNote(event.target.value)} autoFocus />
      : <button type="button" className="tm-resp-link" onClick={() => setNoteOpen(true)}>Add a note for the caregiver</button>}
    <button type="submit" className="tm-resp-primary" disabled={busy || !outcome}>
      {busy ? 'Recording…' : outcome ? 'Record and close' : 'Choose what you found'}
    </button>
    {error && <p className="tm-resp-error" role="alert">{error}</p>}
  </form>
}

/** What to say on the 999 call, and (for the responder who acknowledged) recording that it happened. */
function Emergency({ incident, unit, canRecord }: { incident: Incident; unit: Unit; canRecord: boolean }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unable = incident.events.some(event => event.type === 'unable_to_verify')
  const called = !!eventAt(incident, 'emergency_called')

  async function escalate(action: 'unable_to_verify' | 'emergency_called') {
    setMoreOpen(false)
    setBusy(true)
    setError(null)
    try { applyEvent({ type: 'incident.updated', at: new Date().toISOString(), data: await api.escalateIncident(incident.incident_id, { ...actor, action }) }) }
    catch (cause) { setError(actionError(cause)); await refreshIncident(incident.incident_id) }
    finally { setBusy(false) }
  }

  return <div className="tm-resp-999">
    <p>On a 999 call, give unit <strong>{unit.unit_id}</strong>, Block A, and the access route.</p>
    {canRecord && !called && <>
      <button type="button" className="tm-resp-link tm-resp-more" aria-expanded={moreOpen} onClick={() => setMoreOpen(open => !open)}>
        Report a 999 call or unverified safety<ChevronDown size={14} aria-hidden="true" />
      </button>
      {moreOpen && <div className="tm-resp-more-actions">
        <button type="button" disabled={busy} onClick={() => void escalate('emergency_called')}>I called 999, record it</button>
        {!unable && <button type="button" disabled={busy} onClick={() => void escalate('unable_to_verify')}>I can't verify she is safe</button>}
      </div>}
    </>}
    {error && <p className="tm-resp-error" role="alert">{error}</p>}
  </div>
}

/** The guard's incident response, docked beside the map: one layout from alert to close. */
interface PanelProps {
  incident: Incident; unit: Unit; floor: number; onDone: () => void
  /** The page's alert bar already carries I'll Check Now and Call 999, so the panel doesn't repeat them. */
  inAlertBar?: boolean
  /** 'dialog' is the at-the-door pop-up; the docked 'panel' is hidden while it is open. */
  variant?: 'panel' | 'dialog'
  onOpenDialog?: () => void
  onCloseDialog?: () => void
}

export function IncidentPanel({ incident, unit, floor, onDone, inAlertBar = false, variant = 'panel', onOpenDialog, onCloseDialog }: PanelProps) {
  const [clock, setClock] = useState(() => Date.now())
  const live = ['grace', 'notified'].includes(incident.state)
  useEffect(() => {
    if (!live) return
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [live])

  const resolved = incident.state === 'closed' || incident.state === 'auto_resolved'
  const mine = incident.state === 'acknowledged' && incident.acknowledged_by?.role === 'township' && incident.acknowledged_by.name === responder
  const unable = incident.events.some(event => event.type === 'unable_to_verify')
  const calledAt = eventAt(incident, 'emergency_called')
  const requested = incident.events.find(event => event.type === 'township_requested')
  const homeCheck = isHomeCheck(incident)
  const caregiverCheckingIn = incident.events.some(event => event.type === 'caregiver_checking_in')
  const closer = incident.events.find(event => event.type === 'closed')?.actor
  const tone = resolved ? 'is-closed' : incident.state === 'notified' ? 'is-alert' : 'is-checking'

  const status = resolved ? `Closed${incident.closed_at ? ` at ${clockLabel(incident.closed_at)}` : ''}`
    : incident.state === 'grace' ? `Calling the resident · ${countdown(incident.grace_ends_at, clock)} left`
    : incident.state === 'notified' ? `Needs a responder · reminder ${incident.reminder_count + 1} in ${countdown(incident.next_reminder_at, clock)}`
    : mine ? `You're checking · reminders off${incident.acknowledged_by ? ` since ${clockLabel(incident.acknowledged_by.at)}` : ''}`
    : `${incident.acknowledged_by?.name ?? 'Someone'} is checking`

  const dialog = variant === 'dialog'
  const titleId = `tm-resp-title-${variant}`
  return <section className={`tm-resp ${tone} is-${variant}`} aria-labelledby={titleId}>
    <header className="tm-resp-head">
      <div className="tm-resp-top">
        <p className="tm-resp-unit"><span>{unit.unit_id}</span>Floor {floor} · Block A</p>
        {/* 999 stays one tap away, at the top, for as long as the incident is open. */}
        <div className="tm-resp-top-actions">
          {!resolved && !inAlertBar && <a className="tm-call" href="tel:999"><Phone size={15} aria-hidden="true" />Call 999</a>}
          {dialog && onCloseDialog && <button type="button" className="tm-resp-close" onClick={onCloseDialog}
            aria-label={resolved ? 'Close' : 'Close the pop-up. The check stays open beside the map.'}><X size={18} aria-hidden="true" /></button>}
        </div>
      </div>
      <h2 id={titleId} tabIndex={-1}>{unit.resident_name}</h2>
      <p className="tm-resp-status">{status}</p>
    </header>
    <Steps incident={incident} />

    <div className="tm-resp-body">
      {incident.state === 'grace' && <p className="tm-resp-lead">TemanMu noticed a break in her routine and is calling her first. Nobody is alerted yet.</p>}
      {incident.state === 'notified' && <p className="tm-resp-lead">{alertReason(incident, unit)}.{homeCheck ? '' : ' Her caregiver and you were alerted together.'}</p>}
      {requested && incident.state === 'notified' && !homeCheck && <p className="tm-resp-note">{unit.caregiver_name} asked the township to visit.</p>}
      {caregiverCheckingIn && incident.state === 'notified' && <p className="tm-resp-note">{unit.caregiver_name} is checking in remotely. Her safety is not confirmed.</p>}
      {calledAt && !resolved && <p className="tm-resp-banner" role="status">999 call recorded at {clockLabel(calledAt)}. Keep this open until you know the outcome.</p>}
      {unable && !calledAt && !resolved && <p className="tm-resp-banner" role="status">Safety not verified. Contact the duty supervisor and caregiver.</p>}

      {incident.state === 'notified' && !inAlertBar && <Acknowledge key={incident.incident_id} incident={incident} />}
      {mine && dialog && <p className="tm-resp-lead">Go to unit <strong>{unit.unit_id}</strong> on floor {floor}. {alertReason(incident, unit)}.</p>}
      {mine && <>
        {!dialog && onOpenDialog && <button type="button" className="tm-resp-link" onClick={onOpenDialog}>Open the check form as a pop-up</button>}
        <OutcomeForm key={incident.incident_id} incident={incident} />
      </>}
      {incident.state === 'acknowledged' && !mine && <p className="tm-resp-lead">{incident.acknowledged_by?.name} will record the outcome.</p>}

      {resolved && <div className="tm-resp-done">
        <h3>{outcomeLabel(incident.outcome)}</h3>
        <p>{closer ? `Recorded by ${closer.name}.` : 'Closed automatically after activity at home.'} The caregiver has been told.</p>
        {incident.report && incident.report !== outcomeLabel(incident.outcome) && <p className="tm-resp-report">“{incident.report}”</p>}
        <button type="button" className="tm-resp-secondary" onClick={onDone}>Done</button>
      </div>}
    </div>

    {!resolved && incident.state !== 'grace' && !inAlertBar && <Emergency incident={incident} unit={unit} canRecord={mine} />}
  </section>
}
