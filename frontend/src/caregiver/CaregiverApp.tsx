import { useEffect, useRef, useState } from 'react'
import { Bell, Check, ChevronRight, HeartHandshake, House, PhoneOff, Settings, ShieldCheck, TriangleAlert, Volume2, VolumeX, WifiOff } from 'lucide-react'
import { api } from '../api'
import { ApiError } from '../api/live'
import { applyIncident, getAppState, loadUnitReadings, markNotificationViewed, markRoleViewed, subscribeAppEvents, useAppState } from '../api/store'
import type { Notification } from '../api/types'
import { actorName, ctxFor, NOTIFICATION_TARGET, notificationCopy } from './copy'
import { clock } from './format'
import { HomeTab } from './HomeTab'
import { IncidentView, type AckError } from './IncidentView'
import { SettingsTab, type Theme } from './SettingsTab'
import { playTone, unlockAudio, type ToneKind } from './sound'
import { TogetherTab } from './TogetherTab'
import { UpdatesTab } from './UpdatesTab'
import { useCompanion } from './useCompanion'
import './caregiver.css'

type Tab = 'home' | 'updates' | 'together' | 'settings'
const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: 'home', label: 'Home', Icon: House }, { id: 'updates', label: 'Updates', Icon: Bell },
  { id: 'together', label: 'Together', Icon: HeartHandshake }, { id: 'settings', label: 'Settings', Icon: Settings },
]
const TONES: Partial<Record<Notification['kind'], ToneKind>> = { morning_reassurance: 'morning', alert: 'alert', reminder: 'reminder' }
const THEME_COLOR: Record<Theme, string> = { light: '#faf7f0', dark: '#1b1a18' }

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
  const { connected, loaded, units, incidents, notifications, readingsByUnit, snapshotRevision } = useAppState()
  const unit = units.find(item => item.controllable)
  const unitId = unit?.unit_id
  const [tab, setTab] = useState<Tab>('home')
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [muted, setMuted] = useState(() => readPref(MUTED_KEY) === 'true')
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const [push, setPush] = useState<Notification | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [call, setCall] = useState<'calling' | 'ended' | null>(null)
  const [ackBusy, setAckBusy] = useState(false)
  const [ackError, setAckError] = useState<AckError>(null)
  const [liveNote, setLiveNote] = useState(false)
  const [lastSync, setLastSync] = useState(() => Date.now())
  const [connectionTimedOut, setConnectionTimedOut] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const companion = useCompanion(unitId, snapshotRevision)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mutedRef = useRef(muted)
  const timers = useRef<Record<'push' | 'toast' | 'call', number | undefined>>({ push: undefined, toast: undefined, call: undefined })

  const unitIncidents = incidents.filter(item => item.unit_id === unitId)
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
    if (loaded) return
    const timer = window.setTimeout(() => setConnectionTimedOut(true), 8000)
    return () => window.clearTimeout(timer)
  }, [loaded])

  // Note when an alert the caregiver is looking at resolves on its own.
  useEffect(() => {
    const previous = prevState.current
    prevState.current = incident?.state
    if (incidentOpen && previous && ['grace', 'notified', 'acknowledged'].includes(previous) && incident?.state === 'auto_resolved') setLiveNote(true)
  }, [incident?.state, incidentOpen])

  useEffect(() => subscribeAppEvents(event => {
    setLastSync(Date.now())
    if (event.type === 'snapshot') {
      setIncidentOpen(false); setReadIds(new Set()); setPush(null); setAckError(null); setLiveNote(false)
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
    if (!incident || incident.state === 'grace') return
    setIncidentOpen(true)
    setLiveNote(false)
  }
  function goTo(next: Tab) { setTab(next); setIncidentOpen(false) }
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
  async function acknowledge() {
    if (!unit || !incident || incident.state !== 'notified' || ackBusy) return
    const id = incident.incident_id
    setIncidentOpen(true)
    setLiveNote(false)
    setAckBusy(true)
    setAckError(null)
    try {
      applyIncident(await api.acknowledgeIncident(id, { role: 'caregiver', name: unit.caregiver_name }))
    } catch (error) {
      // 409: someone else acknowledged first, or the alert resolved. Show what actually happened.
      const latest = await api.getIncident(id).catch(() => null)
      if (latest) applyIncident(latest)
      setAckError(error instanceof ApiError && error.status === 409 ? { kind: 'taken', name: latest?.acknowledged_by?.name ?? null } : { kind: 'failed' })
    } finally { setAckBusy(false) }
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
  const connection = !loaded ? 'Connecting' : connected ? 'Live' : 'Reconnecting'
  const pushCopy = push && ctx ? notificationCopy(push, ctx, incidentFor(push)) : null
  const ackWho = incident?.acknowledged_by && ctx ? actorName(ctx, incident.acknowledged_by) : ''

  return <div className={`cg-root ${standalone ? 'is-standalone' : 'is-embedded'}`} data-theme={theme} onPointerDown={unlockAudio}>
    <div className="cg-app">
      <header className="cg-header">
        <span className="cg-wordmark">TemanMu</span>
        <span className={`cg-connection is-${connection.toLowerCase()}`} role="status"><span aria-hidden="true" />{connection}</span>
        <button type="button" className="cg-round" onClick={() => setMuted(value => !value)}
          aria-label={muted ? 'Sounds off. Turn on' : 'Sounds on. Mute'} title={muted ? 'Sounds off. Turn on' : 'Sounds on. Mute'}>
          {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
        </button>
      </header>

      {loaded && !connected && <div className="cg-reconnect" role="status">
        <WifiOff size={18} aria-hidden="true" />
        <span><strong>Reconnecting…</strong> <span>Showing the last update from {clock(lastSync)}.</span></span>
      </div>}

      {ctx && !showIncident && incident?.state === 'notified' && <button type="button" className="cg-concern is-alarm" onClick={openIncident}>
        <TriangleAlert size={22} aria-hidden="true" />
        <span><strong>Unresolved concern: {ctx.R} didn’t answer</strong><span>{incident.reminder_count ? `Reminder #${incident.reminder_count}` : 'Alert sent'} · Tap to respond</span></span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>}
      {ctx && !showIncident && incident?.state === 'acknowledged' && <button type="button" className="cg-concern is-checking" onClick={openIncident}>
        <ShieldCheck size={22} aria-hidden="true" />
        <span><strong>{ackWho} {ackWho === 'You' ? 'are' : 'is'} checking on {ctx.R}</strong><span>{ackWho === 'You' ? 'Record the outcome when you’re done' : `Awaiting ${ackWho}’s outcome`}</span></span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>}

      <div className="cg-scroll" ref={scrollRef}>
        {!loaded ? <div className="cg-loading" role="status">
          <div /><div /><div /><div />
          <p>{connectionTimedOut ? 'Cannot reach TemanMu. Check the backend connection and retry.' : 'Connecting to TemanMu…'}</p>
        </div> : !unit || !ctx ? <p className="cg-card-lead cg-pad">The resident’s home is unavailable.</p>
          : tab === 'home' ? <HomeTab unit={unit} ctx={ctx} incident={incident} feed={feed} readings={readingsByUnit[unit.unit_id] || []} now={now}
            ackBusy={ackBusy} onAck={() => void acknowledge()} onOpenIncident={openIncident} onCall={startCall} />
          : tab === 'updates' ? <UpdatesTab feed={feed} ctx={ctx} now={now} incidentFor={incidentFor} isUnread={isUnread} ackTargetId={ackTargetId}
            ackBusy={ackBusy} onOpen={open} onMarkAllRead={markAllRead} onAck={() => void acknowledge()} />
          : tab === 'together' ? <TogetherTab unit={unit} ctx={ctx} companion={companion} onToast={showToast} />
          : <SettingsTab unit={unit} ctx={ctx} theme={theme} muted={muted} onTheme={setTheme} onToggleMute={() => setMuted(value => !value)} onPreview={playTone} />}
      </div>

      <nav className="cg-nav" aria-label="Main">
        {TABS.map(item => {
          const current = tab === item.id && !showIncident
          return <button key={item.id} type="button" aria-current={current ? 'page' : undefined} className={current ? 'is-current' : ''} onClick={() => goTo(item.id)}>
            <span className="cg-nav-icon"><item.Icon size={22} aria-hidden="true" />
              {item.id === 'updates' && unread > 0 && <span className="cg-nav-badge" aria-label={`${unread} unread`}>{unread}</span>}
            </span>
            <span>{item.label}</span>
          </button>
        })}
      </nav>

      {showIncident && unit && ctx && <IncidentView key={incident.incident_id} incident={incident} unit={unit} ctx={ctx} now={now} liveNote={liveNote}
        ackBusy={ackBusy} ackError={ackError} onAck={() => void acknowledge()} onBack={() => { setIncidentOpen(false); setLiveNote(false) }} />}

      {call && ctx && <div className="cg-scrim">
        <div className="cg-call" role="dialog" aria-label="Simulated call">
          <span className="cg-call-tag">Simulated call</span>
          <strong className="cg-serif">{ctx.R}</strong>
          <span role="status">{call === 'calling' ? 'Calling… (simulated)' : 'Simulated call ended'}</span>
          <p>This is a demo. No real phone call is made and {ctx.R}’s phone won’t ring.</p>
          <button type="button" className={call === 'calling' ? 'is-calling' : ''} onClick={() => setCall(current => current === 'calling' ? 'ended' : null)}>
            {call === 'calling' && <PhoneOff size={18} aria-hidden="true" />}{call === 'calling' ? 'End simulated call' : 'Close'}
          </button>
        </div>
      </div>}

      {push && pushCopy && <button type="button" className={`cg-push ${pushCopy.tone === 'alarm' ? 'is-alarm' : ''}`} onClick={() => open(push)}>
        <span className={`cg-tone-icon tone-${pushCopy.tone}`}><pushCopy.Icon size={18} aria-hidden="true" /></span>
        <span><strong>{pushCopy.title}</strong><span>{pushCopy.body}</span></span>
      </button>}

      {toast && <div className="cg-toast" role="status"><Check size={14} aria-hidden="true" />{toast}</div>}
    </div>
  </div>
}
