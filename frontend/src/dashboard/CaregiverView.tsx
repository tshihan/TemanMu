import { useEffect, useState } from 'react'
import { Bell, CircleCheck, DoorOpen, Droplets, House, Phone, Shield, UserRound, Zap } from 'lucide-react'
import { loadUnitReadings, useAppState } from '../api/store'
import type { Incident, Reading, Unit } from '../api/types'
import { IncidentPanel } from './IncidentPanel'

type Tab = 'home' | 'alerts' | 'profile'
const timeLabel = (iso: string) => new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
const activeIncident = (incident: Incident | null) => !!incident && ['grace', 'notified', 'acknowledged'].includes(incident.state)

function SafetyCard({ unit, incident, readings }: { unit: Unit; incident: Incident | null; readings: Reading[] }) {
  const active = activeIncident(incident)
  const acknowledged = active && incident?.state === 'acknowledged'
  const attention = active || unit.status === 'unusual_inactivity' || unit.status === 'unresolved_concern'
  const closed = incident?.state === 'closed'
  const autoResolved = incident?.state === 'auto_resolved'
  const responder = incident?.acknowledged_by
  const lastActivity = readings.at(-1)
  const waterConcern = incident?.events.some(event => event.type === 'detected' && /water/i.test(event.detail || '')) || /water/i.test(unit.status_reason)
  const heading = acknowledged ? 'Someone has taken the alert' : attention ? 'Attention needed' : closed ? 'Mum’s safety has been confirmed' : autoResolved ? 'Activity has resumed' : unit.status === 'possible_away' ? 'Mum may be out' : 'All looks normal'
  const description = acknowledged ? `${responder?.name || 'A responder'} has acknowledged the alert. Mum’s safety has not yet been confirmed.`
    : attention ? incident?.events.some(event => event.type === 'voice_call_no_answer') ? 'We noticed unusual inactivity and could not reach Mum.' : 'We noticed an unusual break in Mum’s routine.'
    : closed ? `Outcome recorded: ${incident.outcome === 'resident_ok' ? 'Mum is OK' : incident.outcome === 'assistance_provided' ? 'Assistance provided' : 'Mum was away'}.`
    : autoResolved ? 'New activity was detected at home.' : unit.status === 'possible_away' ? 'Door and utility activity suggest Mum may have gone out.' : 'Mum’s recent activity appears normal.'
  return <section className={`care-safety ${attention ? 'is-attention' : 'is-calm'}`} aria-labelledby="care-safety-title">
    <div className="care-safety-heading"><span className="care-safety-icon" aria-hidden="true">{attention ? <Shield size={25} /> : <CircleCheck size={25} />}</span><div><span className="care-safety-kicker">Current safety status</span><h2 id="care-safety-title">{heading}</h2></div></div>
    <p className="care-safety-description">{description}</p>
    {attention && <div className="care-safety-signals">{waterConcern && <span><Droplets size={18} aria-hidden="true" /> No water activity detected</span>}{incident?.events.some(event => event.type === 'voice_call_no_answer') && <span><Phone size={18} aria-hidden="true" /> Mum did not answer our call</span>}</div>}
    {acknowledged && responder && <div className="care-responder"><Shield size={18} aria-hidden="true" /><span><strong>{responder.name}</strong> · Acknowledged at {timeLabel(responder.at)}<small>Awaiting a confirmed outcome</small></span></div>}
    {closed && incident?.closed_at && <p className="care-safety-meta">Confirmed by {responder?.name || 'the care team'} at {timeLabel(incident.closed_at)}</p>}
    {autoResolved && incident?.closed_at && <p className="care-safety-meta">Activity detected at {timeLabel(incident.closed_at)}. No in-person check was recorded.</p>}
    {!attention && !closed && !autoResolved && <p className="care-safety-meta">{lastActivity ? `Last activity update · ${timeLabel(lastActivity.recorded_at)}` : 'No recent sensor update available.'}</p>}
  </section>
}

function ActivitySummary({ readings, unit }: { readings: Reading[]; unit: Unit }) {
  const [todayIso] = useState(() => new Date().toISOString())
  const localDay = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
  const today = localDay(todayIso)
  const items = [{ sensor: 'water', label: 'Water activity', Icon: Droplets }, { sensor: 'electricity', label: 'Electricity activity', Icon: Zap }, { sensor: 'door', label: 'Door activity', Icon: DoorOpen }] as const
  return <section className="care-activity" aria-labelledby="today-heading"><h2 id="today-heading">Today’s activity</h2><div className="care-activity-grid">{items.map(({ sensor, label, Icon }) => {
    const reading = [...readings].reverse().find(item => item.sensor === sensor && localDay(item.recorded_at) === today)
    const value = reading ? sensor === 'door' ? `Door ${reading.value}` : Number(reading.value) > (sensor === 'electricity' ? unit.baseline.standby_power_kw : 0) ? 'Activity detected' : sensor === 'water' ? 'No current flow' : 'Low use'
      : sensor === 'door' ? `Door ${unit.latest.door}` : sensor === 'water' ? unit.latest.water_lpm > 0 ? 'Activity detected' : 'No current flow' : unit.latest.power_kw > unit.baseline.standby_power_kw ? 'Activity detected' : 'Low use'
    const at = reading?.recorded_at || (sensor === 'door' ? unit.latest.last_door_event_at : null)
    return <div className="care-activity-item" key={sensor}><Icon size={20} aria-hidden="true" /><span><strong>{label}</strong><span>{value}</span><small>{at ? timeLabel(at) : 'Update time unavailable'}</small></span></div>
  })}</div></section>
}

export function CaregiverView() {
  const { units, incidents, notifications, readingsByUnit, snapshotRevision } = useAppState()
  const [tab, setTab] = useState<Tab>('home')
  const [readingsError, setReadingsError] = useState<string | null>(null)
  const unit = units.find(item => item.controllable)
  const unitId = unit?.unit_id
  useEffect(() => {
    if (!unitId) return
    void loadUnitReadings(unitId, snapshotRevision).then(() => setReadingsError(null)).catch(() => setReadingsError('Recent sensor activity could not be loaded.'))
  }, [unitId, snapshotRevision])
  if (!unit) return <p className="empty-state">The caregiver’s resident is unavailable.</p>
  const incident = incidents.find(item => item.incident_id === unit.active_incident_id) || [...incidents].filter(item => item.unit_id === unit.unit_id).sort((a, b) => b.opened_at.localeCompare(a.opened_at))[0] || null
  const readings = readingsByUnit[unit.unit_id] || []
  const feed = notifications.filter(item => item.role === 'caregiver' && item.unit_id === unit.unit_id).sort((a, b) => b.created_at.localeCompare(a.created_at))
  return <div className="caregiver-view">
    <div className="care-greeting"><div><p>Good evening</p><h1>Here’s how {unit.caregiver_relationship} is doing.</h1></div><button type="button" aria-label="Open alerts" onClick={() => setTab('alerts')}><Bell size={22} aria-hidden="true" />{feed.some(item => !item.read) && <span className="care-alert-dot" />}</button></div>
    {tab === 'home' && <div className="care-home">
      <section className="care-profile" aria-label="Resident profile"><img src="/images/mum-profile.jpg" alt="Demo portrait of Mum" width="64" height="64" /><div><strong>{unit.caregiver_relationship}</strong><span>{unit.resident_name}</span><small>Updated {timeLabel(unit.status_since)}</small></div><span className={`care-profile-status ${activeIncident(incident) ? 'needs-attention' : ''}`}>{activeIncident(incident) || ['unusual_inactivity', 'unresolved_concern'].includes(unit.status) ? 'Needs attention' : unit.status === 'possible_away' ? 'May be out' : 'Routine'}</span></section>
      <SafetyCard unit={unit} incident={incident} readings={readings} />
      <div className="care-actions" aria-label="Contact options"><button type="button" disabled title="No phone number is connected to this demo"><Phone size={19} aria-hidden="true" />Call {unit.caregiver_relationship}</button><button type="button" disabled title="No guard contact method is connected to this demo"><Shield size={19} aria-hidden="true" />Contact guard</button></div>
      <p className="care-action-note">Calls are unavailable in this demo; no contact numbers are connected.</p>
      <IncidentPanel key={incident?.incident_id || 'empty'} incident={incident} unit={unit} role="caregiver" variant="caregiver" />
      <ActivitySummary readings={readings} unit={unit} />
      {readingsError && <p className="care-error" role="alert">{readingsError}</p>}
    </div>}
    {tab === 'alerts' && <section className="care-alerts" aria-labelledby="alerts-heading"><h2 id="alerts-heading">Alerts and updates</h2><p className="care-section-description">Past notifications are kept here for reference.</p>{feed.length ? <ol>{feed.map(item => <li key={item.notification_id}><span className="care-alert-icon"><Bell size={18} aria-hidden="true" /></span><div><strong>{item.kind === 'morning_reassurance' ? 'Morning update' : item.kind === 'alert' ? 'Safety alert' : item.kind === 'reminder' ? 'Response reminder' : item.kind === 'acknowledged' ? 'Alert acknowledged' : item.kind === 'closed' || item.kind === 'auto_resolved' ? 'Incident resolved' : 'Care update'}</strong><p>{item.kind === 'alert' ? 'We noticed unusual inactivity and could not reach Mum.' : item.kind === 'reminder' ? 'The care team was reminded to respond.' : item.kind === 'acknowledged' ? 'A responder acknowledged the alert. Safety is not yet confirmed.' : item.kind === 'auto_resolved' ? 'New activity was detected at home.' : item.kind === 'closed' ? 'An outcome was recorded by the care team.' : item.message}</p><time dateTime={item.created_at}>{timeLabel(item.created_at)}</time></div></li>)}</ol> : <p className="care-empty">No updates yet.</p>}</section>}
    {tab === 'profile' && <section className="care-profile-page" aria-labelledby="profile-heading"><h2 id="profile-heading">Mum’s profile</h2><img src="/images/mum-profile.jpg" alt="Demo portrait of Mum" width="88" height="88" /><h3>{unit.resident_name}</h3><p>Known as {unit.caregiver_relationship} to {unit.caregiver_name}.</p><p>Home {unit.unit_id}</p><p className="care-profile-note">Contact details and settings are not connected in this demo.</p></section>}
    <nav className="care-bottom-nav" aria-label="Caregiver navigation">{([{ id: 'home', label: 'Home', Icon: House }, { id: 'alerts', label: 'Alerts', Icon: Bell }, { id: 'profile', label: 'Profile', Icon: UserRound }] as const).map(item => <button type="button" key={item.id} className={tab === item.id ? 'is-active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}><item.Icon size={21} aria-hidden="true" /><span>{item.label}</span></button>)}</nav>
  </div>
}
