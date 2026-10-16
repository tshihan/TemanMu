import { useEffect, useState } from 'react'
import { loadUnitReadings, useAppState, type StatusChange } from '../api/store'
import type { Incident, Notification, Reading, Status } from '../api/types'
import { AcknowledgeButton, IncidentPanel } from './IncidentPanel'

const statusLabels: Record<Status, string> = {
  routine: 'Normal routine', possible_away: 'Possible away',
  unusual_inactivity: 'Unusual Inactivity', unresolved_concern: 'Unresolved Concern',
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function timelineTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(iso))
}

function newestIncident(incidents: Incident[], unitId: string, activeId: string | null): Incident | null {
  return incidents.find(item => item.incident_id === activeId) ||
    [...incidents].filter(item => item.unit_id === unitId).sort((a, b) => b.opened_at.localeCompare(a.opened_at))[0] || null
}

interface TimelineEntry { id: string; at: string; title: string; detail: string; tone: 'calm' | 'away' | 'concern' }

function activityTimeline(unitId: string, notifications: Notification[], changes: StatusChange[], readings: Reading[], standbyPowerKw: number): TimelineEntry[] {
  const morning = notifications.filter(item => item.unit_id === unitId && item.role === 'caregiver' && item.kind === 'morning_reassurance').map(item => ({
    id: item.notification_id, at: item.created_at, title: 'Mum appears to be up', detail: 'Her first activity of the day was detected at home.', tone: 'calm' as const,
  }))
  const statuses = changes.filter(item => item.unit_id === unitId).map(item => {
    if (item.status === 'possible_away') return { id: `status-${item.at}`, at: item.at, title: 'Mum may have gone out', detail: 'Door activity and quiet utilities suggest an outing.', tone: 'away' as const }
    if (item.status === 'unusual_inactivity') return { id: `status-${item.at}`, at: item.at, title: 'Mum has been unusually inactive', detail: 'Her quiet period exceeded her usual pattern.', tone: 'concern' as const }
    if (item.status === 'unresolved_concern') return { id: `status-${item.at}`, at: item.at, title: 'Care team alerted', detail: 'No activity was detected during the check.', tone: 'concern' as const }
    if (item.previous_status === 'possible_away') return { id: `status-${item.at}`, at: item.at, title: 'Mum seems to be back home', detail: 'Activity resumed after a possible outing.', tone: 'calm' as const }
    return { id: `status-${item.at}`, at: item.at, title: 'Mum’s routine resumed', detail: 'Her status returned to normal.', tone: 'calm' as const }
  })
  const sensorActivity = readings.filter(item => item.unit_id === unitId).flatMap((item, index): TimelineEntry[] => {
    const entry = { id: `reading-${index}-${item.recorded_at}`, at: item.recorded_at, tone: 'calm' as const }
    if (item.sensor === 'water' && typeof item.value === 'number') return [{
      ...entry,
      title: item.value > 0 ? 'Water use detected' : 'Water use ended',
      detail: item.value > 0 ? 'The home’s water sensor recorded activity.' : 'Water flow returned to zero.',
    }]
    if (item.sensor === 'electricity' && typeof item.value === 'number') return [{
      ...entry,
      title: item.value > standbyPowerKw ? 'Electricity use increased' : 'Electricity returned to standby',
      detail: item.value > standbyPowerKw ? 'Power use rose above the usual standby level.' : 'Power use returned to its usual standby level.',
    }]
    if (item.sensor === 'door') return [{
      ...entry,
      title: item.value === 'open' ? 'Front door opened' : 'Front door closed',
      detail: `The front door sensor reported ${item.value}.`,
    }]
    return []
  })
  return [...morning, ...statuses, ...sensorActivity].sort((a, b) => a.at.localeCompare(b.at)).slice(-30)
}

export function CaregiverView() {
  const { units, incidents, notifications, statusHistory, readingsByUnit, snapshotRevision } = useAppState()
  const [callNotice, setCallNotice] = useState(false)
  const [readingsError, setReadingsError] = useState<string | null>(null)
  const unit = units.find(item => item.controllable)
  const unitId = unit?.unit_id

  useEffect(() => {
    if (!unitId) return
    void loadUnitReadings(unitId, snapshotRevision)
      .then(() => setReadingsError(null))
      .catch(() => setReadingsError('Could not load earlier sensor activity.'))
  }, [unitId, snapshotRevision])

  if (!unit) return <p className="empty-state">The caregiver's resident is unavailable.</p>

  const incident = newestIncident(incidents, unit.unit_id, unit.active_incident_id)
  const feed = notifications.filter(item => item.role === 'caregiver' && item.unit_id === unit.unit_id)
  const needsResponse = incident && ['grace', 'notified'].includes(incident.state)
  const timeline = activityTimeline(unit.unit_id, notifications, statusHistory, readingsByUnit[unit.unit_id] || [], unit.baseline.standby_power_kw)

  return <div className="caregiver-view">
    <section className="caregiver-status" aria-label="Resident status">
      <span className={`caregiver-status-indicator status-${unit.status}`} role="status"><span aria-hidden="true" />{statusLabels[unit.status]}</span>
      <div className="caregiver-status-top">
        <img className="caregiver-portrait" src="/images/mum-profile.jpg" alt="Demo portrait of Mum" width="360" height="360" />
        <div className="caregiver-status-side">
          <div className="caregiver-identity">
            <h3>{unit.caregiver_relationship}</h3>
            <span className="caregiver-full-name">{unit.resident_name}</span>
          </div>
          <div className="caregiver-status-bottom"><span>Updated {timeLabel(unit.status_since)}</span><button type="button" onClick={() => setCallNotice(true)}>Call {unit.caregiver_relationship}</button></div>
        </div>
      </div>
      {callNotice && <p className="simulated-call" role="status">Simulated call to {unit.caregiver_relationship} started. No real phone call is placed.</p>}
    </section>

    {(timeline.length > 0 || readingsError) && <section className="caregiver-timeline" aria-labelledby="activity-heading">
      <h3 id="activity-heading">Mum’s day</h3>
      <ol className="daily-timeline" aria-label="Mum’s activity in time order">
        {timeline.map(item => <li key={item.id} className={`daily-timeline-${item.tone}`}>
          <time dateTime={item.at}>{timelineTimeLabel(item.at)}</time>
          <span className="daily-timeline-marker" aria-hidden="true" />
          <div><strong>{item.title}</strong><p>{item.detail}</p></div>
        </li>)}
      </ol>
      {readingsError && <p role="alert">{readingsError}</p>}
    </section>}

    <IncidentPanel key={incident?.incident_id || 'empty'} incident={incident} unit={unit} role="caregiver" />

    <section className="caregiver-feed" aria-labelledby="feed-heading">
      <div className="section-intro"><h3 id="feed-heading">Updates for {unit.caregiver_relationship}</h3><span>{feed.length} messages</span></div>
      {feed.length ? <div className="notification-list">{feed.map(item => <article className={`notification-row notification-${item.kind}`} key={item.notification_id}>
        <div className="notification-top"><strong>{item.kind.replaceAll('_', ' ')}</strong><time dateTime={item.created_at}>{timeLabel(item.created_at)}</time></div>
        <p>{item.message}</p>
        {(item.kind === 'alert' || item.kind === 'reminder') && needsResponse && incident.incident_id === item.incident_id &&
          <AcknowledgeButton incident={incident} unit={unit} role="caregiver" />}
      </article>)}</div> :
        <p className="empty-state">No updates yet. A morning reading will send reassurance here.</p>}
    </section>
  </div>
}
