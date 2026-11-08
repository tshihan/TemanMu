import { useEffect, useRef, useState } from 'react'
import { Bell, Check, ChevronRight, HeartHandshake, House, Luggage, PhoneOff, Settings, ShieldCheck, TriangleAlert, WifiOff } from 'lucide-react'
import { api } from '../api'
import { applyEvent, applyIncident, getAppState, loadUnitReadings, markNotificationViewed, markRoleViewed, subscribeAppEvents, useAppState } from '../api/store'
import type { AwayActivityResponse, Notification } from '../api/types'
import { ConfirmContext, useConfirmAlert } from './ConfirmAlert'
import { actorName, awaitingAnswer, ctxFor, currentAway, GUARD, isHomeCheck, NOTIFICATION_TARGET, notificationCopy } from './copy'
import { clock, initials } from './format'
import { HistoryView } from './HistoryView'
import { RoutineView } from './RoutineView'
import { HomeTab } from './HomeTab'
import { HospitalDetails } from './HospitalDetails'
import { latestHospitalTransfer } from './hospital-transfer'
import { IncidentView, type AckError } from './IncidentView'
import { SettingsTab, type Theme } from './SettingsTab'
import { playTone, unlockAudio, type ToneKind } from './sound'
import { TogetherTab } from './TogetherTab'
import { UpdatesTab } from './UpdatesTab'
import { useAwayReasons } from './useAwayReasons'
import { useCompanion } from './useCompanion'
import './caregiver.css'

type Tab = 'home' | 'updates' | 'together' | 'settings'
const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: 'home', label: 'Home', Icon: House }, { id: 'updates', label: 'Updates', Icon: Bell },
  { id: 'together', label: 'Together', Icon: HeartHandshake }, { id: 'settings', label: 'Settings', Icon: Settings },
]
const TONES: Partial<Record<Notification['kind'], ToneKind>> = { morning_reassurance: 'morning', alert: 'alert', reminder: 'reminder' }
const THEME_COLOR: Record<Theme, string> = { light: '#fef9ef', dark: '#101310' }

// Preferences are per device; storage can be unavailable (private mode), so every access is guarded.
const THEME_KEY = 'temanmu.caregiver.theme'
const MUTED_KEY = 'temanmu.caregiver.muted'
function readPref(key: string): string | null { try { return localStorage.getItem(key) } catch { return null } }
function writePref(key: string, value: string) { try { localStorage.setItem(key, value) } catch { /* not persisted */ } }
const initialTheme = (): Theme => {
  const saved = readPref(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** The caregiver's mobile app. `standalone` fills the screen (the installed app); otherwise it sits in a phone frame. */
export function CaregiverApp({ standalone = false }: { standalone?: boolean }) {
  const { connected, loaded, units, incidents, notifications, readingsByUnit, accessByUnit, snapshotRevision } = useAppState()
  const unit = units.find(item => item.controllable)
  const unitId = unit?.unit_id
  const [tab, setTab] = useState<Tab>('home')
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [routineOpen, setRoutineOpen] = useState(false)
  const [hospitalOpen, setHospitalOpen] = useState(false)
  // A past alert opened from the history; the current one opens through incidentOpen.
  const [pastIncidentId, setPastIncidentId] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [muted, setMuted] = useState(() => readPref(MUTED_KEY) === 'true')
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const [push, setPush] = useState<Notification | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [call, setCall] = useState<'calling' | 'ended' | null>(null)
  const [ackBusy, setAckBusy] = useState(false)
  const [ackError, setAckError] = useState<AckError>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmError, setConfirmError] = useState(false)
  const [answerBusy, setAnswerBusy] = useState(false)
  const [answerError, setAnswerError] = useState(false)
  const [liveNote, setLiveNote] = useState(false)
  const [lastSync, setLastSync] = useState(() => Date.now())
  const [connectionTimedOut, setConnectionTimedOut] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const { confirm, alert } = useConfirmAlert()
  const companion = useCompanion(unitId, snapshotRevision)
  const awayReasons = useAwayReasons(unit)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mutedRef = useRef(muted)
  const timers = useRef<Record<'push' | 'toast' | 'call', number | undefined>>({ push: undefined, toast: undefined, call: undefined })

  const unitIncidents = incidents.filter(item => item.unit_id === unitId)
  const hospitalIncident = latestHospitalTransfer(unitIncidents)
  const incident = unitIncidents.find(item => item.incident_id === unit?.active_incident_id)
    || [...unitIncidents].sort((a, b) => b.opened_at.localeCompare(a.opened_at))[0] || null
  const seenReminders = new Set<string>()
  const feed = notifications
    .filter(item => item.role === 'caregiver' && item.unit_id === unitId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .filter(item => {
      if (item.kind !== 'reminder' || !item.incident_id) return true
      if (seenReminders.has(item.incident_id)) return false
      seenReminders.add(item.incident_id)
      return true
    })
  const away = unit ? currentAway(unit, now) : null
  const awayNotice = feed.find(n => awaitingAnswer(n, away)) || null
  const isUnread = (n: Notification) => !n.read && !readIds.has(n.notification_id)
  const unread = feed.filter(isUnread).length
  const showIncident = incidentOpen && !!incident && incident.state !== 'grace'
  const prevState = useRef(incident?.state)

  useEffect(() => { mutedRef.current = muted; writePref(MUTED_KEY, String(muted)) }, [muted])
  useEffect(() => { writePref(THEME_KEY, theme) }, [theme])
  useEffect(() => {
    if (!standalone) return
    const meta = document.querySelector('meta[name="theme-color"]')
    const previous = meta?.getAttribute('content')
    meta?.setAttribute('content', THEME_COLOR[theme])
    return () => { if (previous) meta?.setAttribute('content', previous) }
  }, [standalone, theme])
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    const pending = timers.current
    return () => { window.clearInterval(tick); Object.values(pending).forEach(id => window.clearTimeout(id)) }
  }, [])
  useEffect(() => {
    if (unitId) void loadUnitReadings(unitId, snapshotRevision).catch(() => { /* Today at home falls back to current values. */ })
  }, [unitId, snapshotRevision])
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [tab])
  useEffect(() => {
    if (!call) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setCall(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [call])
  useEffect(() => {
    if (loaded) return
    const timer = window.setTimeout(() => setConnectionTimedOut(true), 8000)
    return () => window.clearTimeout(timer)
  }, [loaded])

  // A new check or concern brings Home back to the top, where its hero and action live.
  useEffect(() => {
    if ((incident?.state === 'grace' || incident?.state === 'notified') && tab === 'home') scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [incident?.state, tab])

  // Note when an alert the caregiver is looking at resolves on its own.
  useEffect(() => {
    const previous = prevState.current
    prevState.current = incident?.state
    if (incidentOpen && previous && ['grace', 'notified', 'acknowledged'].includes(previous) && incident?.state === 'auto_resolved') setLiveNote(true)
  }, [incident?.state, incidentOpen])

  useEffect(() => subscribeAppEvents(event => {
    setLastSync(Date.now())
    if (event.type === 'snapshot') {
      setIncidentOpen(false); setHospitalOpen(false); setPastIncidentId(null); setReadIds(new Set()); setPush(null); setAckError(null); setLiveNote(false)
      return
    }
    if (event.type !== 'notification.created' || event.data.role !== 'caregiver') return
    if (event.data.unit_id !== getAppState().units.find(item => item.controllable)?.unit_id) return
    const n = event.data
    setPush(n)
    window.clearTimeout(timers.current.push)
    timers.current.push = window.setTimeout(() => setPush(null), n.kind === 'alert' ? 7000 : 4500)
    const tone = TONES[n.kind]
    if (tone && !mutedRef.current) playTone(tone)
  }), [])

  function showToast(text: string) {
    setToast(text)
    window.clearTimeout(timers.current.toast)
    timers.current.toast = window.setTimeout(() => setToast(null), 3200)
  }
  function openIncident() {
    setHospitalOpen(false)
    if (!incident || incident.state === 'grace') return
    setIncidentOpen(true)
    setLiveNote(false)
  }
  function goTo(next: Tab) {
    setHospitalOpen(false)
    // Tapping the tab you're already on returns to its top, as native apps do.
    if (next === tab && !showIncident) scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setTab(next)
    setIncidentOpen(false)
    setHistoryOpen(false)
    setRoutineOpen(false)
    setPastIncidentId(null)
  }
  function openHistoryIncident(id: string) {
    if (id === incident?.incident_id) openIncident()
    else setPastIncidentId(id)
  }
  function open(n: Notification) {
    setReadIds(ids => new Set(ids).add(n.notification_id))
    void markNotificationViewed(n.notification_id, 'caregiver').catch(() => {
      setReadIds(ids => { const next = new Set(ids); next.delete(n.notification_id); return next })
      showToast('Could not mark this update as read')
    })
    setPush(null)
    const target = NOTIFICATION_TARGET[n.kind]
    if (target === 'incident') openIncident()
    else goTo(target)
  }
  function markAllRead() {
    const ids = feed.map(item => item.notification_id)
    setReadIds(current => new Set([...current, ...ids]))
    void markRoleViewed('caregiver').catch(() => {
      setReadIds(current => { const next = new Set(current); ids.forEach(id => next.delete(id)); return next })
      showToast('Could not mark updates as read')
    })
  }
  async function respond(action: 'caregiver_checking_in' | 'township_requested' | 'resident_confirmed_safe') {
    if (!unit || !incident || !['notified', 'acknowledged'].includes(incident.state) || ackBusy) return
    const id = incident.incident_id
    setLiveNote(false)
    setAckBusy(true)
    setAckError(null)
    try {
      applyIncident(await api.caregiverResponse(id, { role: 'caregiver', name: unit.caregiver_name, action }))
    } catch {
      const latest = await api.getIncident(id).catch(() => null)
      if (latest) applyIncident(latest)
      setAckError({ kind: 'failed' })
    } finally { setAckBusy(false) }
  }
  async function confirmHome() {
    if (!unit || unit.status !== 'possible_away' || confirmBusy) return
    const R = unit.caregiver_relationship
    if (!await confirm({ title: `Confirm ${R} is okay`, message: `Have you spoken directly with ${R} and confirmed they are home and okay?`, confirmLabel: 'Confirm' })) return
    setConfirmBusy(true)
    setConfirmError(false)
    try {
      const confirmed = await api.confirmHome(unit.unit_id, { role: 'caregiver', name: unit.caregiver_name })
      applyEvent({ type: 'unit.updated', at: confirmed.status_since, data: confirmed })
      setCall(null)
    } catch {
      const latest = await api.getUnit(unit.unit_id).catch(() => null)
      if (latest) applyEvent({ type: 'unit.updated', at: latest.status_since, data: latest })
      setConfirmError(true)
    } finally { setConfirmBusy(false) }
  }
  async function answerAway(n: Notification, response: AwayActivityResponse) {
    if (!unit || answerBusy) return
    const R = unit.caregiver_relationship
    if (response === 'resident_returned' && !await confirm({ title: 'End away period?', message: `End the away period now? Inactivity alerts for ${R} will start again.`, confirmLabel: 'End now' })) return
    setAnswerBusy(true)
    setAnswerError(false)
    try {
      const answered = await api.respondToAwayActivity(n.notification_id, { role: 'caregiver', name: unit.caregiver_name, response })
      applyEvent({ type: 'notification.updated', at: answered.responded_at ?? answered.created_at, data: answered })
      showToast(response === 'home_check_requested' ? `${GUARD} has been asked to check the home`
        : response === 'resident_returned' ? `Away period ended. ${R} is marked home` : 'Got it. No check requested')
    } catch { setAnswerError(true) }
    finally { setAnswerBusy(false) }
  }
  function startCall() {
    setCall('calling')
    window.clearTimeout(timers.current.call)
    timers.current.call = window.setTimeout(() => setCall(current => current ? 'ended' : null), 4000)
  }

  const ctx = unit ? ctxFor(unit) : null
  const incidentFor = (n: Notification) => incidents.find(item => item.incident_id === n.incident_id)
  const latestAlert = feed.find(item => item.kind === 'alert' || item.kind === 'reminder')
  const ackTargetId = incident?.state === 'notified' && latestAlert?.incident_id === incident.incident_id ? latestAlert.notification_id : null
  const pushCopy = push && ctx ? notificationCopy(push, ctx, incidentFor(push)) : null
  const showHospital = hospitalOpen && unit?.care_state === 'in_hospital'
  const pushBanner = push && pushCopy ? <button type="button" className={`cg-push ${pushCopy.tone === 'alarm' ? 'is-alarm' : ''}`} onClick={() => open(push)}>
    <span className={`cg-tone-icon tone-${pushCopy.tone}`}><pushCopy.Icon size={18} aria-hidden="true" /></span>
    <span><strong>{pushCopy.title}</strong><span>{pushCopy.body}</span></span>
  </button> : null
  const ackWho = incident?.acknowledged_by && ctx ? actorName(ctx, incident.acknowledged_by) : ''
  const pastIncident = incidents.find(item => item.incident_id === pastIncidentId) ?? null
  // Today's history row is live, so fetch it again when readings, alerts or away periods change.
  const historyRevision = `${snapshotRevision}:${unitId ? readingsByUnit[unitId]?.length ?? 0 : 0}:${unitId ? accessByUnit[unitId]?.length ?? 0 : 0}:${unitIncidents.map(item => item.state).join()}:${unit?.away_periods.map(item => item.ends_at).join() ?? ''}`

  return <div className={`cg-root ${standalone ? 'is-standalone' : 'is-embedded'}`} data-theme={theme} onPointerDown={unlockAudio}>
    <ConfirmContext.Provider value={confirm}>
    <div className="cg-app">
      {loaded && !connected && <div className="cg-reconnect" role="status">
        <WifiOff size={18} aria-hidden="true" />
        <span><strong>Reconnecting…</strong> <span>Showing the last update from {clock(lastSync)}.</span></span>
      </div>}

      {ctx && !showIncident && tab !== 'home' && incident?.state === 'notified' && <button type="button" className="cg-concern is-alarm" onClick={openIncident}>
        <TriangleAlert size={22} aria-hidden="true" />
        <span><strong>{isHomeCheck(incident) ? 'Home check requested' : 'Unusual inactivity'}</strong><span>{incident.reminder_count ? `Reminder #${incident.reminder_count}` : 'Alert sent'} · {isHomeCheck(incident) ? 'Tap for details' : 'Tap to respond'}</span></span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>}
      {ctx && !showIncident && tab !== 'home' && awayNotice && <button type="button" className="cg-concern is-away" onClick={() => goTo('home')}>
        <Luggage size={22} aria-hidden="true" />
        <span><strong>Activity while {ctx.R} is away</strong><span>Do you know who’s there? · Tap to answer</span></span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>}
      {ctx && !showIncident && tab !== 'home' && incident?.state === 'acknowledged' && <button type="button" className="cg-concern is-checking" onClick={openIncident}>
        <ShieldCheck size={22} aria-hidden="true" />
        <span><strong>{ackWho} {ackWho === 'You' ? 'are' : 'is'} checking on {ctx.R}</strong><span>{ackWho === 'You' ? 'Record the outcome when you’re done' : `Awaiting ${ackWho}’s outcome`}</span></span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>}

      <div className="cg-scroll" ref={scrollRef}>
        {!loaded ? <div className="cg-loading" role="status">
          <div /><div /><div /><div />
          <p>{connectionTimedOut ? 'Cannot reach TemanMu. Check the backend connection and retry.' : 'Connecting to TemanMu…'}</p>
        </div> : !unit || !ctx ? <p className="cg-card-lead cg-pad">The resident’s home is unavailable.</p>
          : tab === 'home' ? <HomeTab unit={unit} ctx={ctx} incident={incident} hospitalIncident={hospitalIncident} onOpenHospital={() => setHospitalOpen(true)} readings={readingsByUnit[unit.unit_id] || []} taps={accessByUnit[unit.unit_id] || []} now={now} awayReasons={awayReasons}
            ackBusy={ackBusy} responseError={ackError?.kind === 'failed'} confirmBusy={confirmBusy} confirmError={confirmError}
            muted={muted} onToggleMute={() => setMuted(value => !value)}
            awayNotice={awayNotice} answerBusy={answerBusy} answerError={answerError}
            onCheckIn={() => void respond('caregiver_checking_in')}
            onRequestVisit={() => void respond('township_requested')} onOpenIncident={openIncident} onCall={startCall} onConfirmHome={() => void confirmHome()}
            onAnswerAway={(n, response) => void answerAway(n, response)} onOpenHistory={() => setHistoryOpen(true)} />
          : tab === 'updates' ? <UpdatesTab feed={feed} ctx={ctx} now={now} incidentFor={incidentFor} isUnread={isUnread} ackTargetId={ackTargetId}
            ackBusy={ackBusy} onOpen={open} onMarkAllRead={markAllRead} onAck={openIncident} />
          : tab === 'together' ? <TogetherTab unit={unit} ctx={ctx} companion={companion} onToast={showToast} />
          : <SettingsTab unit={unit} ctx={ctx} now={now} awayReasons={awayReasons} theme={theme} onTheme={setTheme} onToast={showToast} onOpenRoutine={() => setRoutineOpen(true)} />}
      </div>

      <nav className="cg-nav" aria-label="Main">
        {TABS.map(item => {
          const current = tab === item.id && !showIncident
          return <button key={item.id} type="button" aria-current={current ? 'page' : undefined} className={current ? 'is-current' : ''} onClick={() => goTo(item.id)}>
            <span className="cg-nav-icon"><item.Icon size={21} aria-hidden="true" />
              {item.id === 'updates' && unread > 0 && <span className="cg-nav-badge" aria-label={`${unread} unread`}>{unread}</span>}
            </span>
            <span>{item.label}</span>
          </button>
        })}
      </nav>

      {showHospital && <HospitalDetails incident={hospitalIncident} onClose={() => setHospitalOpen(false)}>{pushBanner}</HospitalDetails>}

      {historyOpen && unit && ctx && <HistoryView unit={unit} ctx={ctx} now={now} revision={historyRevision}
        onBack={() => setHistoryOpen(false)} onOpenIncident={openHistoryIncident} />}

      {routineOpen && unit && ctx && <RoutineView unit={unit} ctx={ctx} onBack={() => setRoutineOpen(false)} />}

      {pastIncident && unit && ctx && <IncidentView key={pastIncident.incident_id} incident={pastIncident} unit={unit} ctx={ctx} now={now} liveNote={false}
        ackBusy={false} ackError={null} onAck={() => {}} onCheckIn={() => {}} onConfirmSafe={() => {}} onBack={() => setPastIncidentId(null)} />}

      {showIncident && unit && ctx && <IncidentView key={incident.incident_id} incident={incident} unit={unit} ctx={ctx} now={now} liveNote={liveNote}
        ackBusy={ackBusy} ackError={ackError} onAck={() => void respond('township_requested')} onCheckIn={() => void respond('caregiver_checking_in')} onConfirmSafe={() => void respond('resident_confirmed_safe')} onBack={() => { setIncidentOpen(false); setLiveNote(false) }} />}

      {call && ctx && <div className="cg-scrim" onClick={event => { if (event.target === event.currentTarget) setCall(null) }}>
        <div className={`cg-call ${call === 'calling' ? 'is-calling' : ''}`} role="dialog" aria-modal="true" aria-label="Voice call">
          <span className="cg-call-tag">Voice call</span>
          <span className="cg-call-avatar" aria-hidden="true"><span /><span />{initials(ctx.R)}</span>
          <strong>{ctx.R}</strong>
          <span role="status">{call === 'calling' ? 'Calling…' : 'Call ended'}</span>
          <button type="button" autoFocus className={call === 'calling' ? 'is-calling' : ''} onClick={() => setCall(current => current === 'calling' ? 'ended' : null)}>
            {call === 'calling' && <PhoneOff size={18} aria-hidden="true" />}{call === 'calling' ? 'End call' : 'Close'}
          </button>
        </div>
      </div>}

      {!showHospital && pushBanner}

      {toast && <div className="cg-toast" role="status"><Check size={15} aria-hidden="true" />{toast}</div>}
      {alert}
    </div>
    </ConfirmContext.Provider>
  </div>
}
