import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { usingMock } from '../api'
import type { Incident, IncidentEventType, Unit } from '../api/types'
import { outcomeLabel } from '../caregiver/copy'
import { completedAt, finishedIncidents, originalTrigger, townshipRequestedCount, type HistoryPeriod } from './incident-history'
import './incident-history.css'

const PAGE_SIZE = 20
const dateFormat = new Intl.DateTimeFormat('en-MY', {
  timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
const dateLabel = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : 'Not recorded'
const EVENT_LABELS: Record<IncidentEventType, string> = {
  detected: 'Incident detected', voice_call_started: 'Simulated call started', voice_call_no_answer: 'Simulated call unanswered',
  voice_call_cancelled: 'Simulated call cancelled', notified: 'Family and township alert stage', reminder: 'Reminder recorded',
  acknowledged: 'Responder accepted', caregiver_checking_in: 'Caregiver checking in', township_requested: 'Township check requested',
  unable_to_verify: 'Safety could not be verified', emergency_called: '999 call reported; dispatch not confirmed',
  closed: 'Incident closed', auto_resolved: 'Automatically resolved',
}

function Outcome({ incident }: { incident: Incident }) {
  return <div className="tm-history-outcome">
    <span>{incident.outcome ? outcomeLabel(incident.outcome) : 'Not recorded'}</span>
    {incident.state === 'auto_resolved' && <small>Automatically resolved · safety not confirmed</small>}
  </div>
}

export function IncidentHistory({ incidents, units, now, connected, active, snapshotRevision }: {
  incidents: Incident[]; units: Unit[]; now: number; connected: boolean; active: boolean; snapshotRevision: number
}) {
  const [period, setPeriod] = useState<HistoryPeriod>(7)
  const [pagination, setPagination] = useState({ page: 1, revision: snapshotRevision })
  const [selection, setSelection] = useState<{ id: string | null; revision: number }>({ id: null, revision: snapshotRevision })
  const setPage = (page: number) => setPagination({ page, revision: snapshotRevision })
  const setSelectedId = (id: string | null) => setSelection({ id, revision: snapshotRevision })
  const rows = finishedIncidents(incidents, period, now)
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = pagination.revision === snapshotRevision ? Math.min(pagination.page, pageCount) : 1
  const selected = active && selection.revision === snapshotRevision ? incidents.find(incident => incident.incident_id === selection.id && (incident.state === 'closed' || incident.state === 'auto_resolved')) : undefined
  const selectedUnit = selected && units.find(unit => unit.unit_id === selected.unit_id)

  return <section id="tm-panel-history" role="tabpanel" aria-labelledby="tm-tab-history" hidden={!active} className="tm-history">
    <header className="tm-history-head">
      <div className="tm-title"><h1>Incident log</h1><p>Finished incidents · Malaysia time</p></div>
      <div className="tm-history-period" role="group" aria-label="Incident history period">
        {([7, 30, 'all'] as const).map(value => <button type="button" key={value} aria-pressed={period === value}
          onClick={() => { setPeriod(value); setPage(1) }}>{value === 'all' ? 'All' : `${value} days`}</button>)}
      </div>
    </header>
    <p className="tm-history-source" role="status">
      {usingMock ? 'Simulated demo data · Reset Demo clears this history.' : 'Backend records'}
      {!connected && <strong> Connection lost. Showing the last received records; updates may be delayed.</strong>}
    </p>
    <dl className="tm-history-stats">
      <div><dt>Finished incidents</dt><dd>{rows.length}<small>{period === 'all' ? 'Across available history' : `Completed in the past ${period} days`}</small></dd></div>
      <div><dt>Township help requested</dt><dd>{townshipRequestedCount(rows)}<small>Reached the township alert stage</small></dd></div>
      <div><dt>Enrolled residents</dt><dd>{units.length}<small>Current enrolment, including away and hospital</small></dd></div>
    </dl>
    <div className="tm-history-records">
      <h2>Finished incidents <span>{rows.length}</span></h2>
      {rows.length === 0 ? <div className="tm-history-empty" role="status"><h3>No finished incidents {period === 'all' ? 'yet' : 'in this period'}</h3><p>Completed checks and automatically resolved incidents will appear here.</p></div>
        : <>
          <p className="tm-history-scroll-hint">Scroll across the table to see outcomes and details.</p>
          <div className="tm-history-table-wrap" tabIndex={0} role="region" aria-label="Finished incident records">
            <table className="tm-history-table">
              <caption className="tm-sr">Finished incidents, newest completion first. All times are Malaysia time.</caption>
              <thead><tr><th scope="col">Completed</th><th scope="col">Unit / resident</th><th scope="col">Trigger</th><th scope="col">Responder</th><th scope="col">Outcome</th><th scope="col"><span className="tm-sr">Details</span></th></tr></thead>
              <tbody>{rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(incident => {
                const unit = units.find(item => item.unit_id === incident.unit_id)
                return <tr key={incident.incident_id}>
                  <td><time dateTime={completedAt(incident) ?? undefined}>{dateLabel(completedAt(incident))}</time></td>
                  <td><strong>{incident.unit_id}</strong><span className="tm-history-secondary">{unit?.resident_name || 'Not recorded'}</span></td>
                  <td><span className="tm-history-trigger">{originalTrigger(incident)}</span></td>
                  <td>{incident.acknowledged_by?.name || 'Not recorded'}</td>
                  <td><Outcome incident={incident} /></td>
                  <td><button type="button" className="tm-history-details-button" aria-label={`View details for ${incident.unit_id}, ${incident.incident_id}`} onClick={() => setSelectedId(incident.incident_id)}>View details</button></td>
                </tr>
              })}</tbody>
            </table>
          </div>
          <nav className="tm-history-pagination" aria-label="Incident log pages">
            <p role="status">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, rows.length)} of {rows.length}</p>
            <div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div>
          </nav>
        </>}
    </div>
    <IncidentDetails incident={selected} unit={selectedUnit} onClose={() => setSelectedId(null)} />
  </section>
}

function IncidentDetails({ incident, unit, onClose }: { incident?: Incident; unit?: Unit; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (incident && !dialog.open) dialog.showModal()
    else if (!incident && dialog.open) dialog.close()
  }, [incident])
  return <dialog ref={dialogRef} className="tm-history-drawer" aria-labelledby="tm-history-detail-title" onClose={onClose}>
    {incident && <>
      <header><div><p>{incident.incident_id}</p><h2 id="tm-history-detail-title">Incident details</h2></div><button type="button" aria-label="Close incident details" onClick={onClose}><X size={22} aria-hidden="true" /></button></header>
      <div className="tm-history-drawer-body">
        <h3>{incident.unit_id} · {unit?.resident_name || 'Not recorded'}</h3>
        <dl className="tm-history-facts">
          <div><dt>Original trigger</dt><dd>{originalTrigger(incident)}</dd></div>
          <div><dt>Opened</dt><dd>{dateLabel(incident.opened_at)}</dd></div>
          <div><dt>Completed</dt><dd>{dateLabel(completedAt(incident))}</dd></div>
          <div><dt>Responder</dt><dd>{incident.acknowledged_by ? `${incident.acknowledged_by.name} (${incident.acknowledged_by.role})` : 'Not recorded'}</dd></div>
          <div><dt>Accepted</dt><dd>{dateLabel(incident.acknowledged_by?.at)}</dd></div>
          <div><dt>Outcome</dt><dd><Outcome incident={incident} /></dd></div>
          {incident.outcome === 'sent_to_hospital' && <>
            <div><dt>Hospital</dt><dd>{incident.hospital_name || 'Not recorded'}</dd></div>
            <div><dt>Time sent to hospital</dt><dd>{dateLabel(incident.hospital_sent_at)}</dd></div>
          </>}
          <div><dt>Saved note</dt><dd>{incident.report?.trim() || 'Not recorded'}</dd></div>
        </dl>
        <h3>Event timeline</h3>
        {incident.events.length === 0 ? <p>Not recorded</p> : <ol className="tm-history-timeline">
          {[...incident.events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map((event, index) => <li key={`${event.type}-${event.at}-${index}`}>
            <strong>{EVENT_LABELS[event.type]}</strong><time dateTime={event.at}>{dateLabel(event.at)}</time>
            {event.actor && <span>{event.actor.name} ({event.actor.role})</span>}{event.detail && <p>{event.detail}</p>}
          </li>)}
        </ol>}
      </div>
    </>}
  </dialog>
}
