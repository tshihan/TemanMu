import { Fragment, useEffect, useState } from 'react'
import { Check, ChevronDown, Phone, X } from 'lucide-react'
import seed from '../../../shared/seed.json'
import { api } from '../api'
import { ApiError } from '../api/live'
import { applyEvent } from '../api/store'
import type { Incident, Outcome, Unit } from '../api/types'
import { HOME_CHECK_OUTCOMES, cardConcern, isHomeCheck, outcomeLabel } from '../caregiver/copy'
import { outcomeText, useT, type Dict, type Rich } from './i18n'

type CloseOutcome = Exclude<Outcome, 'resident_activity_detected'>
const outcomes: CloseOutcome[] = ['resident_ok', 'assistance_provided', 'sent_to_hospital', 'resident_away']
// A home check during an away period records what was found at the home, not the resident's condition.
const outcomesFor = (incident: Incident): CloseOutcome[] => isHomeCheck(incident) ? HOME_CHECK_OUTCOMES.map(item => item.value) : outcomes

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

function actionError(t: Dict, error: unknown): string {
  if (error instanceof ApiError && error.status === 409) return t.errorChanged
  if (error instanceof ApiError && error.status === 403) return t.errorNotMine
  return error instanceof Error ? error.message : t.errorGeneric
}

/** Every odd-numbered part of the text in bold. */
const rich = (parts: Rich) => parts.map((part, index) => index % 2 ? <strong key={index}>{part}</strong> : <Fragment key={index}>{part}</Fragment>)

async function refreshIncident(id: string): Promise<void> {
  try {
    const latest = await api.getIncident(id)
    applyEvent({ type: 'incident.updated', at: new Date().toISOString(), data: latest })
  } catch { /* The original action error remains visible. */ }
}

const eventAt = (incident: Incident, type: Incident['events'][number]['type']) => incident.events.find(event => event.type === type)?.at

/** Why the guard is being asked, in the guard's words. The detected detail names what tripped the alert. */
export function alertReason(t: Dict, incident: Incident, unit: Unit): string {
  const r = t.alertReason
  if (isHomeCheck(incident)) return r.homeCheck(unit.caregiver_name)
  const card = cardConcern(incident)
  if (card === 'not_back') return r.notBack
  if (card === 'arrival') return r.arrival
  const detected = incident.events.find(event => event.type === 'detected')?.detail
  const why = detected === 'Outing longer than usual' ? r.outing
    : detected === 'No water activity since confirmed contact' ? r.sinceConfirmed
    : r.quietGap
  return r.noAnswer(why)
}

/** Privacy: a card home's last tap is shown to the guard only while a concern is open. */
function LastTap({ unit }: { unit: Unit }) {
  const t = useT()
  const tap = unit.last_access
  if (unit.outing_signal !== 'card' || !tap) return null
  return <p className="tm-resp-tap"><strong>{t.lastTap}</strong> {tap.access_point} · {tap.direction === 'out' ? t.tapOut : t.tapIn} · {clockLabel(tap.at)}</p>
}

/** Where to look first: outside for "not back yet", the way home for a tap in with no activity. */
function whereToLook(t: Dict, incident: Incident, unit: Unit, floor: number) {
  const card = cardConcern(incident)
  const place = unit.last_access?.access_point ?? t.lobbyWord
  if (card === 'not_back') return rich(t.lookNotBack(place))
  if (card === 'arrival') return rich(t.lookArrival(place, unit.unit_id, floor))
  return rich(t.lookGo(unit.unit_id, floor, alertReason(t, incident, unit)))
}

/** Where the incident is on the response path: the same four steps in every state. */
function Steps({ incident }: { incident: Incident }) {
  const t = useT()
  const closedAt = incident.closed_at ?? eventAt(incident, 'closed') ?? eventAt(incident, 'auto_resolved')
  const steps = [
    { key: 'detected', label: t.steps.detected, at: eventAt(incident, 'detected') ?? incident.opened_at },
    { key: 'alerted', label: t.steps.alerted, at: eventAt(incident, 'notified') },
    { key: 'checking', label: t.steps.checking, at: incident.acknowledged_by?.at ?? eventAt(incident, 'acknowledged') },
    { key: 'closed', label: t.steps.closed, at: closedAt ?? undefined },
  ]
  const current = steps.findIndex(step => !step.at)
  return <ol className="tm-steps" aria-label={t.responseProgress}>
    {steps.map((step, index) => <li key={step.key} className={step.at ? 'is-done' : index === current ? 'is-now' : ''}
      aria-current={index === current ? 'step' : undefined}>
      <span className="tm-step-mark" aria-hidden="true">{step.at && <Check size={11} strokeWidth={3} />}</span>
      <span className="tm-step-label">{step.label}</span>
      <time className="tm-step-time" dateTime={step.at}>{step.at ? clockLabel(step.at) : index === current ? t.steps.next : '–'}</time>
    </li>)}
  </ol>
}

export function Acknowledge({ incident, className = 'tm-resp-primary' }: { incident: Incident; className?: string }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function acknowledge() {
    setBusy(true)
    setError(null)
    try { await api.acknowledgeIncident(incident.incident_id, actor) }
    catch (cause) { setError(actionError(t, cause)); await refreshIncident(incident.incident_id) }
    finally { setBusy(false) }
  }
  return <>
    <button type="button" className={className} disabled={busy} onClick={() => void acknowledge()}>{busy ? t.recording : t.checkNowButton}</button>
    {error && <p className="tm-resp-error" role="alert">{error}</p>}
  </>
}

/** Now as a datetime-local value in Malaysia time, e.g. "2026-11-04T09:30". */
function malaysiaNow(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** At the door: pick what was found. Recording it closes the incident. */
function OutcomeForm({ incident }: { incident: Incident }) {
  const t = useT()
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
      setError(t.errorTime)
      return
    }
    setBusy(true)
    setError(null)
    // The backend requires a township report; the outcome label stands in when no note is added.
    // Saved in English, so the caregiver app and backend see the same wording whatever language the guard uses.
    const report = note.trim() || outcomeLabel(outcome)
    try { applyEvent({ type: 'incident.updated', at: new Date().toISOString(), data: await api.closeIncident(incident.incident_id, {
      ...actor, outcome, report,
      ...(outcome === 'sent_to_hospital' ? { hospital_name: hospitalName.trim() || null, hospital_sent_at: sentAt === null ? null : new Date(sentAt).toISOString() } : {}),
    }) }) }
    catch (cause) { setError(actionError(t, cause)); await refreshIncident(incident.incident_id) }
    finally { setBusy(false) }
  }

  return <form className="tm-outcome" onSubmit={event => { event.preventDefault(); void submit() }} noValidate>
    <h3 id={titleId}>{isHomeCheck(incident) ? t.whatFoundHome : t.whatFound}</h3>
    <div className="tm-outcome-options" role="radiogroup" aria-labelledby={titleId}>
      {options.map(value => <button key={value} type="button" role="radio" aria-checked={outcome === value}
        className="tm-outcome-option" disabled={busy || !allowed(value)} onClick={() => {
          setPicked(value)
          // Most transfers are recorded as they happen, so the time starts at now; the guard can change it.
          if (value === 'sent_to_hospital' && !hospitalTime) setHospitalTime(malaysiaNow())
        }}>
        <span className="tm-outcome-dot" aria-hidden="true" />
        <span className="tm-outcome-text"><span>{outcomeText(t, value)}</span>{t.outcomeHelp[value] && <small>{t.outcomeHelp[value]}</small>}</span>
      </button>)}
    </div>
    {outcome === 'sent_to_hospital' && <div className="tm-hospital-fields">
      <label>{t.hospitalName}<input type="text" maxLength={200} value={hospitalName} onChange={event => setHospitalName(event.target.value)} disabled={busy} /></label>
      <label>{t.hospitalTime}<input type="datetime-local" value={hospitalTime} onChange={event => setHospitalTime(event.target.value)} disabled={busy} /></label>
      <p>{t.hospitalHelp}</p>
    </div>}
    {unable && !called && !isHomeCheck(incident) && <p className="tm-resp-hint">{t.record999First}</p>}
    {noteOpen
      ? <textarea className="tm-outcome-note" rows={2} maxLength={500} aria-label={t.noteLabel} placeholder={t.notePlaceholder}
          value={note} onChange={event => setNote(event.target.value)} autoFocus />
      : <button type="button" className="tm-resp-link" onClick={() => setNoteOpen(true)}>{t.addNote}</button>}
    <button type="submit" className="tm-resp-primary" disabled={busy || !outcome}>
      {busy ? t.recording : outcome ? t.recordClose : t.chooseFound}
    </button>
    {error && <p className="tm-resp-error" role="alert">{error}</p>}
  </form>
}

/** What to say on the 999 call, and (for the responder who acknowledged) recording that it happened. */
function Emergency({ incident, unit, canRecord }: { incident: Incident; unit: Unit; canRecord: boolean }) {
  const t = useT()
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
    catch (cause) { setError(actionError(t, cause)); await refreshIncident(incident.incident_id) }
    finally { setBusy(false) }
  }

  return <div className="tm-resp-999">
    <p>{rich(t.on999(unit.unit_id))}</p>
    {canRecord && !called && <>
      <button type="button" className="tm-resp-link tm-resp-more" aria-expanded={moreOpen} onClick={() => setMoreOpen(open => !open)}>
        {t.report999}<ChevronDown size={14} aria-hidden="true" />
      </button>
      {moreOpen && <div className="tm-resp-more-actions">
        <button type="button" disabled={busy} onClick={() => void escalate('emergency_called')}>{t.called999}</button>
        {!unable && <button type="button" disabled={busy} onClick={() => void escalate('unable_to_verify')}>{t.cantVerify}</button>}
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
  const t = useT()
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
  const card = cardConcern(incident)

  const status = resolved ? t.statusClosed(incident.closed_at ? clockLabel(incident.closed_at) : null)
    : incident.state === 'grace' ? t.statusGrace(countdown(incident.grace_ends_at, clock))
    : incident.state === 'notified' ? t.statusNotified(incident.reminder_count + 1, countdown(incident.next_reminder_at, clock))
    : mine ? t.statusMine(incident.acknowledged_by ? clockLabel(incident.acknowledged_by.at) : null)
    : t.isChecking(incident.acknowledged_by?.name ?? t.someone)

  const dialog = variant === 'dialog'
  const titleId = `tm-resp-title-${variant}`
  return <section className={`tm-resp ${tone} is-${variant}`} aria-labelledby={titleId}>
    <header className="tm-resp-head">
      <div className="tm-resp-top">
        <p className="tm-resp-unit"><span>{unit.unit_id}</span>{t.unitFloorBlock(floor)}</p>
        {/* 999 stays one tap away, at the top, for as long as the incident is open. */}
        <div className="tm-resp-top-actions">
          {!resolved && !inAlertBar && <a className="tm-call" href="tel:999"><Phone size={15} aria-hidden="true" />{t.call999}</a>}
          {dialog && onCloseDialog && <button type="button" className="tm-resp-close" onClick={onCloseDialog}
            aria-label={resolved ? t.close : t.closePopup}><X size={18} aria-hidden="true" /></button>}
        </div>
      </div>
      <h2 id={titleId} tabIndex={-1}>{unit.resident_name}</h2>
      {card && !resolved && <p className={`tm-resp-kind is-${card}`}>{card === 'not_back' ? t.kindNotBack : t.kindArrival}</p>}
      <p className="tm-resp-status">{status}</p>
    </header>
    <Steps incident={incident} />

    <div className="tm-resp-body">
      {incident.state === 'grace' && <p className="tm-resp-lead">{t.leadGrace}</p>}
      {incident.state === 'notified' && <p className="tm-resp-lead">{alertReason(t, incident, unit)}.{homeCheck ? '' : t.leadAlertedTogether}</p>}
      {!resolved && <LastTap unit={unit} />}
      {requested && incident.state === 'notified' && !homeCheck && <p className="tm-resp-note">{t.askedTownship(unit.caregiver_name)}</p>}
      {caregiverCheckingIn && incident.state === 'notified' && <p className="tm-resp-note">{t.checkingInRemotely(unit.caregiver_name)}</p>}
      {calledAt && !resolved && <p className="tm-resp-banner" role="status">{t.called999At(clockLabel(calledAt))}</p>}
      {unable && !calledAt && !resolved && <p className="tm-resp-banner" role="status">{t.safetyNotVerified}</p>}

      {incident.state === 'notified' && !inAlertBar && <Acknowledge key={incident.incident_id} incident={incident} />}
      {mine && (dialog || card) && <p className="tm-resp-lead">{whereToLook(t, incident, unit, floor)}</p>}
      {mine && <>
        {!dialog && onOpenDialog && <button type="button" className="tm-resp-link" onClick={onOpenDialog}>{t.openPopup}</button>}
        <OutcomeForm key={incident.incident_id} incident={incident} />
      </>}
      {incident.state === 'acknowledged' && !mine && <p className="tm-resp-lead">{t.willRecord(incident.acknowledged_by?.name ?? t.someone)}</p>}

      {resolved && <div className="tm-resp-done">
        <h3>{outcomeText(t, incident.outcome)}</h3>
        <p>{closer ? t.recordedBy(closer.name) : t.closedAuto}{t.caregiverTold}</p>
        {incident.report && incident.report !== outcomeLabel(incident.outcome) && <p className="tm-resp-report">“{incident.report}”</p>}
        <button type="button" className="tm-resp-secondary" onClick={onDone}>{t.done}</button>
      </div>}
    </div>

    {!resolved && incident.state !== 'grace' && !inAlertBar && <Emergency incident={incident} unit={unit} canRecord={mine} />}
  </section>
}
