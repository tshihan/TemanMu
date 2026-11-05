import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { usingMock } from '../api'
import type { Incident, Unit } from '../api/types'
import { completedAt, finishedIncidents, originalTrigger, townshipRequestedCount, type HistoryPeriod } from './incident-history'
import { detailText, outcomeText, useT, type Dict } from './i18n'
import './incident-history.css'

const PAGE_SIZE = 20
const dateFormats = new Map<string, Intl.DateTimeFormat>()
const dateLabel = (t: Dict, value: string | null | undefined) => {
  if (!value || !Number.isFinite(Date.parse(value))) return t.notRecorded
  if (!dateFormats.has(t.locale)) dateFormats.set(t.locale, new Intl.DateTimeFormat(t.locale, {
    timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }))
  return dateFormats.get(t.locale)!.format(new Date(value))
}

function Outcome({ incident }: { incident: Incident }) {
  const t = useT()
  return <div className="tm-history-outcome">
    <span>{incident.outcome ? outcomeText(t, incident.outcome) : t.notRecorded}</span>
    {incident.state === 'auto_resolved' && <small>{t.autoNotConfirmed}</small>}
  </div>
}

const trigger = (t: Dict, incident: Incident) => {
  const text = originalTrigger(incident)
  return text === 'Not recorded' ? t.notRecorded : detailText(t, text)
}

export function IncidentHistory({ incidents, units, now, connected, active, snapshotRevision }: {
  incidents: Incident[]; units: Unit[]; now: number; connected: boolean; active: boolean; snapshotRevision: number
}) {
  const t = useT()
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
      <div className="tm-title"><h1>{t.incidentLog}</h1><p>{t.finishedMalaysia}</p></div>
      <div className="tm-history-period" role="group" aria-label={t.historyPeriod}>
        {([7, 30, 'all'] as const).map(value => <button type="button" key={value} aria-pressed={period === value}
          onClick={() => { setPeriod(value); setPage(1) }}>{value === 'all' ? t.all : t.days(value)}</button>)}
      </div>
    </header>
    <p className="tm-history-source" role="status">
      {usingMock ? t.sourceMock : t.sourceLive}
      {!connected && <strong>{t.connectionLost}</strong>}
    </p>
    <dl className="tm-history-stats">
      <div><dt>{t.finishedIncidents}</dt><dd>{rows.length}<small>{period === 'all' ? t.acrossHistory : t.completedPast(period)}</small></dd></div>
      <div><dt>{t.townshipHelp}</dt><dd>{townshipRequestedCount(rows)}<small>{t.reachedTownship}</small></dd></div>
      <div><dt>{t.enrolled}</dt><dd>{units.length}<small>{t.enrolledHelp}</small></dd></div>
    </dl>
    <div className="tm-history-records">
      <h2>{t.finishedIncidents} <span>{rows.length}</span></h2>
      {rows.length === 0 ? <div className="tm-history-empty" role="status"><h3>{t.noFinished(period === 'all')}</h3><p>{t.noFinishedHelp}</p></div>
        : <>
          <p className="tm-history-scroll-hint">{t.scrollTable}</p>
          <div className="tm-history-table-wrap" tabIndex={0} role="region" aria-label={t.recordsRegion}>
            <table className="tm-history-table">
              <caption className="tm-sr">{t.tableCaption}</caption>
              <thead><tr><th scope="col">{t.col.completed}</th><th scope="col">{t.col.unit}</th><th scope="col">{t.col.trigger}</th><th scope="col">{t.col.responder}</th><th scope="col">{t.col.outcome}</th><th scope="col"><span className="tm-sr">{t.col.details}</span></th></tr></thead>
              <tbody>{rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(incident => {
                const unit = units.find(item => item.unit_id === incident.unit_id)
                return <tr key={incident.incident_id}>
                  <td><time dateTime={completedAt(incident) ?? undefined}>{dateLabel(t, completedAt(incident))}</time></td>
                  <td><strong>{incident.unit_id}</strong><span className="tm-history-secondary">{unit?.resident_name || t.notRecorded}</span></td>
                  <td><span className="tm-history-trigger">{trigger(t, incident)}</span></td>
                  <td>{incident.acknowledged_by?.name || t.notRecorded}</td>
                  <td><Outcome incident={incident} /></td>
                  <td><button type="button" className="tm-history-details-button" aria-label={t.viewDetailsFor(incident.unit_id, incident.incident_id)} onClick={() => setSelectedId(incident.incident_id)}>{t.viewDetails}</button></td>
                </tr>
              })}</tbody>
            </table>
          </div>
          <nav className="tm-history-pagination" aria-label={t.pagesNav}>
            <p role="status">{t.rangeOf((currentPage - 1) * PAGE_SIZE + 1, Math.min(currentPage * PAGE_SIZE, rows.length), rows.length)}</p>
            <div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>{t.previous}</button><span>{t.pageOf(currentPage, pageCount)}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>{t.next}</button></div>
          </nav>
        </>}
    </div>
    <IncidentDetails incident={selected} unit={selectedUnit} onClose={() => setSelectedId(null)} />
  </section>
}

function IncidentDetails({ incident, unit, onClose }: { incident?: Incident; unit?: Unit; onClose: () => void }) {
  const t = useT()
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (incident && !dialog.open) dialog.showModal()
    else if (!incident && dialog.open) dialog.close()
  }, [incident])
  return <dialog ref={dialogRef} className="tm-history-drawer" aria-labelledby="tm-history-detail-title" onClose={onClose}>
    {incident && <>
      <header><div><p>{incident.incident_id}</p><h2 id="tm-history-detail-title">{t.incidentDetails}</h2></div><button type="button" aria-label={t.closeDetails} onClick={onClose}><X size={22} aria-hidden="true" /></button></header>
      <div className="tm-history-drawer-body">
        <h3>{incident.unit_id} · {unit?.resident_name || t.notRecorded}</h3>
        <dl className="tm-history-facts">
          <div><dt>{t.originalTrigger}</dt><dd>{trigger(t, incident)}</dd></div>
          <div><dt>{t.opened}</dt><dd>{dateLabel(t, incident.opened_at)}</dd></div>
          <div><dt>{t.col.completed}</dt><dd>{dateLabel(t, completedAt(incident))}</dd></div>
          <div><dt>{t.col.responder}</dt><dd>{incident.acknowledged_by ? `${incident.acknowledged_by.name} (${t.role[incident.acknowledged_by.role] ?? incident.acknowledged_by.role})` : t.notRecorded}</dd></div>
          <div><dt>{t.accepted}</dt><dd>{dateLabel(t, incident.acknowledged_by?.at)}</dd></div>
          <div><dt>{t.col.outcome}</dt><dd><Outcome incident={incident} /></dd></div>
          {incident.outcome === 'sent_to_hospital' && <>
            <div><dt>{t.hospital}</dt><dd>{incident.hospital_name || t.notRecorded}</dd></div>
            <div><dt>{t.timeSent}</dt><dd>{dateLabel(t, incident.hospital_sent_at)}</dd></div>
          </>}
          <div><dt>{t.savedNote}</dt><dd>{incident.report?.trim() || t.notRecorded}</dd></div>
        </dl>
        <h3>{t.timeline}</h3>
        {incident.events.length === 0 ? <p>{t.notRecorded}</p> : <ol className="tm-history-timeline">
          {[...incident.events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map((event, index) => <li key={`${event.type}-${event.at}-${index}`}>
            <strong>{t.event[event.type]}</strong><time dateTime={event.at}>{dateLabel(t, event.at)}</time>
            {event.actor && <span>{event.actor.name} ({t.role[event.actor.role] ?? event.actor.role})</span>}{event.detail && <p>{detailText(t, event.detail)}</p>}
          </li>)}
        </ol>}
      </div>
    </>}
  </dialog>
}
