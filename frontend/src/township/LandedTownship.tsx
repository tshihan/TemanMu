import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronRight, Minus, PhoneCall, Plus, RotateCcw, Search, Timer, TriangleAlert, X } from 'lucide-react'
import { CheckDialog, TownshipShell } from '../dashboard/TownshipView'
import { IncidentHistory } from '../dashboard/IncidentHistory'
import { outcomeText, useLang, useT } from '../dashboard/i18n'
import type { Incident } from '../api/types'
import { attentionStatus, initialHomes, needsAttention, officialBrochure, type DemoHome } from './demoData'
import './landed.css'

const LandedScene = lazy(() => import('./LandedScene'))
const outcomes = ['resident_ok', 'assistance_provided', 'sent_to_hospital', 'resident_away'] as const
type DemoOutcome = typeof outcomes[number]
type RecordItem = { home: DemoHome; outcome: DemoOutcome; note: string; hospital: string; hospitalTime: string }
type AlertStatus = 'unresolved_concern' | 'unusual_inactivity'
const words = {
  en: {
    summary: 'Landed homes · 24 enrolled sample households', demo: 'UI demo · simulated cases',
    note: 'Illustrative model based on the official brochure. Home IDs, addresses and cases are samples. Actions stay in this demo session.',
    search: 'Home ID or street', searchLabel: 'Find a landed home', noMatch: 'No matching home. Try IR3-018 or a street number.', noConcern: 'has no open attention case.',
    resident: 'Sample resident', address: 'Sample address', three: '3D neighbourhood', top: 'Top view', plan: 'Official plan', loading: 'Preparing the neighbourhood model…',
    unavailable: 'The 3D view could not load. Use Needs attention or open the official plan.', openPlan: 'Open official plan', source: 'Official brochure · PDF page 8', sourceLink: 'Open source brochure',
    mapNote: 'Simplified massing and sample home positions, not a surveyed map.', mapHint: 'Drag to orbit · scroll to zoom', neutral: 'Other homes', guardhouse: 'Guardhouse', courtyard: 'Communal courtyard',
    waiting: 'needs a responder now', reason: 'No water use for longer than the usual quiet gap, and no answer to TemanMu’s call.', together: 'The family and township were alerted together in this demo.', go: 'Go to',
    responder: 'Township operator (demo)', guardOnDuty: 'Guardhouse · township responder', demoAction: 'Demo only. No calls or notifications are sent.', reset: 'Reset demo',
    saved: 'Demo outcome saved. The case is now in Incident log.', resetDone: 'Demo reset to its original cases.',
    acknowledged: 'You’re checking · reminders off', calling: 'Calling the resident first. No township response is needed yet.',
  },
  ms: {
    summary: 'Rumah bertanah · 24 rumah contoh berdaftar', demo: 'Demo UI · kes simulasi',
    note: 'Model ilustrasi berdasarkan brosur rasmi. ID rumah, alamat dan kes ialah contoh. Tindakan disimpan dalam sesi demo ini sahaja.',
    search: 'ID rumah atau jalan', searchLabel: 'Cari rumah bertanah', noMatch: 'Tiada rumah sepadan. Cuba IR3-018 atau nombor jalan.', noConcern: 'tiada kes yang memerlukan perhatian.',
    resident: 'Penghuni contoh', address: 'Alamat contoh', three: 'Kejiranan 3D', top: 'Pandangan atas', plan: 'Pelan rasmi', loading: 'Sedang menyediakan model kejiranan…',
    unavailable: 'Paparan 3D tidak dapat dimuatkan. Gunakan senarai Perlu dicek atau buka pelan rasmi.', openPlan: 'Buka pelan rasmi', source: 'Brosur rasmi · halaman PDF 8', sourceLink: 'Buka brosur sumber',
    mapNote: 'Bentuk bangunan dipermudah dan lokasi rumah contoh, bukan peta ukur.', mapHint: 'Seret untuk putar · tatal untuk zum', neutral: 'Rumah lain', guardhouse: 'Pondok pengawal', courtyard: 'Laman komuniti',
    waiting: 'perlukan pengawal sekarang', reason: 'Tiada penggunaan air melebihi tempoh senyap biasa dan panggilan TemanMu tidak dijawab.', together: 'Keluarga dan pengawal dimaklumkan serentak dalam demo ini.', go: 'Pergi ke',
    responder: 'Operator perbandaran (demo)', guardOnDuty: 'Pondok pengawal · petugas perbandaran', demoAction: 'Demo sahaja. Tiada panggilan atau notifikasi dihantar.', reset: 'Set semula demo',
    saved: 'Hasil demo disimpan. Kes kini dalam Senarai kes.', resetDone: 'Demo dikembalikan ke kes asal.',
    acknowledged: 'Anda sedang cek · peringatan dihentikan', calling: 'Sedang telefon penghuni dahulu. Pengawal belum perlu bertindak.',
  },
}
type Copy = typeof words.en

class SceneBoundary extends Component<{ children: ReactNode; onFallback: () => void; copy: Copy }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div className="lt-scene-message" role="alert"><p>{this.props.copy.unavailable}</p><button onClick={this.props.onFallback}>{this.props.copy.openPlan}</button></div> : this.props.children
  }
}

function DemoResponse({ home, copy, dialog = false, onClose, onOpen, onSave }: {
  home: DemoHome; copy: Copy; dialog?: boolean; onClose?: () => void; onOpen: () => void
  onSave: (outcome: DemoOutcome, note: string, hospital: string, time: string) => void
}) {
  const t = useT()
  const [outcome, setOutcome] = useState<DemoOutcome | ''>('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [hospital, setHospital] = useState('')
  const [hospitalTime, setHospitalTime] = useState('2026-11-09T10:40')
  const [timeError, setTimeError] = useState(false)
  const checking = home.status === 'checking'
  const titleId = `tm-resp-title-${dialog ? 'dialog' : 'panel'}`
  return <section className={`tm-resp ${checking ? 'is-checking' : 'is-alert'} is-${dialog ? 'dialog' : 'panel'}`} aria-labelledby={titleId}>
    <header className="tm-resp-head"><div className="tm-resp-top"><p className="tm-resp-unit"><span>{home.id}</span>{copy.address} · Ilham {home.street.split(' ').at(-1)}</p>{dialog && <button type="button" className="tm-resp-close" aria-label={t.closePopup} onClick={onClose}><X size={18} aria-hidden="true" /></button>}</div><h2 id={titleId} tabIndex={-1}>{copy.resident} {home.id.slice(-3)}</h2><p className="tm-resp-status">{checking ? copy.acknowledged : home.status === 'inactivity' ? copy.calling : t.needsResponder}</p></header>
    <ol className="tm-steps" aria-label={t.responseProgress}>{Object.entries(t.steps).filter(([key]) => key !== 'next').map(([key, label], i) => {
      const done = i === 0 || i === 1 && home.status !== 'inactivity' || i === 2 && checking
      const current = i === (home.status === 'inactivity' ? 1 : checking ? 3 : 2)
      return <li key={key} className={done ? 'is-done' : current ? 'is-now' : ''} aria-current={current ? 'step' : undefined}><span className="tm-step-mark" aria-hidden="true">{done && <Check size={11} />}</span><span className="tm-step-label">{label}</span><time className="tm-step-time">{done ? ['10:20', '10:28', '10:32'][i] : current ? t.steps.next : '–'}</time></li>
    })}</ol>
    <div className="tm-resp-body"><p className="tm-resp-lead">{home.status === 'inactivity' ? copy.calling : checking ? <>{copy.go} <strong>No. {home.number}, {home.street}</strong>.</> : <>{copy.reason} {copy.together}</>}</p>
      {checking && <>{!dialog && <button type="button" className="tm-resp-link" onClick={onOpen}>{t.openPopup}</button>}
        <form className="tm-outcome" onSubmit={event => {
          event.preventDefault()
          if (!outcome) return
          if (outcome === 'sent_to_hospital' && hospitalTime && (!Number.isFinite(Date.parse(`${hospitalTime}+08:00`)) || Date.parse(`${hospitalTime}+08:00`) > Date.parse('2026-11-09T10:40:00+08:00'))) { setTimeError(true); return }
          onSave(outcome, note.trim(), hospital.trim(), hospitalTime)
        }}><h3>{t.whatFound}</h3><div className="tm-outcome-options" role="group" aria-label={t.whatFound}>{outcomes.map(value => <label key={value} className={`tm-outcome-option ${outcome === value ? 'is-picked' : ''}`}><input type="radio" name={`landed-outcome-${dialog ? 'dialog' : 'panel'}`} value={value} checked={outcome === value} onChange={() => { setOutcome(value); setTimeError(false) }} /><span className="tm-outcome-text"><span>{outcomeText(t, value)}</span>{t.outcomeHelp[value] && <small>{t.outcomeHelp[value]}</small>}</span></label>)}</div>
          {outcome === 'sent_to_hospital' && <div className="tm-hospital-fields"><label>{t.hospitalName}<input type="text" maxLength={200} value={hospital} onChange={e => setHospital(e.target.value)} /></label><label>{t.hospitalTime}<input type="datetime-local" max="2026-11-09T10:40" value={hospitalTime} onChange={e => { setHospitalTime(e.target.value); setTimeError(false) }} /></label></div>}
          {noteOpen ? <textarea className="tm-outcome-note" rows={2} maxLength={500} aria-label={t.noteLabel} placeholder={t.notePlaceholder} value={note} onChange={e => setNote(e.target.value)} autoFocus /> : <button type="button" className="tm-resp-link" onClick={() => setNoteOpen(true)}>{t.addNote}</button>}
          {timeError && <p className="tm-resp-error" role="alert">{t.errorTime}</p>}<button type="submit" className="tm-resp-primary" disabled={!outcome}>{outcome ? t.recordClose : t.chooseFound}</button>
        </form></>}
      <p className="tm-resp-hint">{copy.demoAction}</p>
    </div>
  </section>
}

export default function LandedTownship() {
  const t = useT()
  const copy = words[useLang()]
  const [homes, setHomes] = useState(initialHomes)
  const [selected, setSelected] = useState('IR3-018')
  const [filter, setFilter] = useState<AlertStatus | null>(null)
  const [query, setQuery] = useState('')
  const [queryMsg, setQueryMsg] = useState('')
  const [view, setView] = useState<'3d' | 'top' | 'plan'>('3d')
  const [zoom, setZoom] = useState(1)
  const [reset, setReset] = useState(0)
  const [tab, setTab] = useState<'live' | 'history'>('live')
  const [records, setRecords] = useState<RecordItem[]>([])
  const [notice, setNotice] = useState('')
  const [unavailable, setUnavailable] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [session, setSession] = useState(0)
  const labels = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const attention = homes.filter(needsAttention).sort((a, b) => Number(a.status === 'inactivity') - Number(b.status === 'inactivity') || a.id.localeCompare(b.id))
  const home = attention.find(h => h.id === selected)
  const waiting = homes.find(h => h.status === 'concern')
  useEffect(() => { document.title = 'Ilham Residence 3 · TemanMu township demo' }, [])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (tab !== 'live' || dialogOpen || event.metaKey || event.ctrlKey || event.altKey || (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, button, a'))) return
      if (event.key === '/') { event.preventDefault(); search.current?.focus() }
      if ((event.key === 'j' || event.key === 'k') && attention.length) { event.preventDefault(); const i = attention.findIndex(h => h.id === selected); setSelected(attention[(i + (event.key === 'j' ? 1 : -1) + attention.length) % attention.length].id) }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [attention, selected, tab, dialogOpen])
  const select = (id: string) => { setSelected(id); setNotice('') }
  const accept = () => {
    if (!waiting) return
    setHomes(current => current.map(h => h.id === waiting.id ? { ...h, status: 'checking' } : h)); select(waiting.id); setDialogOpen(true)
  }
  const save = (outcome: DemoOutcome, note: string, hospital: string, hospitalTime: string) => {
    if (!home || home.status !== 'checking') return
    setRecords(current => [{ home, outcome, note, hospital: outcome === 'sent_to_hospital' ? hospital : '', hospitalTime: outcome === 'sent_to_hospital' ? hospitalTime : '' }, ...current])
    setHomes(current => current.map(h => h.id === home.id ? { ...h, status: 'routine' } : h)); setSelected(attention.find(h => h.id !== home.id)?.id ?? ''); setDialogOpen(false); setNotice(copy.saved)
  }
  const restart = () => { setHomes(initialHomes); setSelected('IR3-018'); setRecords([]); setQuery(''); setQueryMsg(''); setFilter(null); setTab('live'); setNotice(copy.resetDone); setReset(v => v + 1); setZoom(1); setSession(v => v + 1); setDialogOpen(false); setUnavailable(false) }
  const historyUnits = homes.map(h => ({ unit_id: h.id, resident_name: `${copy.resident} ${h.id.slice(-3)} · No. ${h.number}, ${h.street}` }))
  const historyIncidents: Incident[] = records.map(record => ({
    incident_id: `landed-demo-${session}-${record.home.id}`, unit_id: record.home.id, trigger_reason: copy.reason,
    state: 'closed', opened_at: '2026-11-09T10:20:00+08:00', grace_ends_at: null, next_reminder_at: null, reminder_count: 0,
    acknowledged_by: { role: 'township', name: copy.responder, at: '2026-11-09T10:32:00+08:00' },
    outcome: record.outcome, report: record.note || null, hospital_name: record.hospital || null,
    hospital_sent_at: record.hospitalTime ? `${record.hospitalTime}+08:00` : null, closed_at: '2026-11-09T10:40:00+08:00',
    events: [
      { type: 'detected', at: '2026-11-09T10:20:00+08:00' }, { type: 'notified', at: '2026-11-09T10:28:00+08:00' },
      { type: 'acknowledged', at: '2026-11-09T10:32:00+08:00', actor: { role: 'township', name: copy.responder } },
      { type: 'closed', at: '2026-11-09T10:40:00+08:00', actor: { role: 'township', name: copy.responder } },
    ],
  }))
  const jump = () => {
    const value = query.toLowerCase().trim()
    if (!value) { setQueryMsg(''); return }
    const found = homes.find(h => `${h.id} ${h.street}`.toLowerCase().includes(value))
    if (!found) { setQueryMsg(copy.noMatch); return }
    if (!needsAttention(found)) { setQueryMsg(`${found.id} ${copy.noConcern}`); return }
    select(found.id); setFilter(null); setQueryMsg('')
  }
  return <TownshipShell tab={tab} onSelect={setTab} needsResponse={!!waiting}><div className="tm-township lt-township">
    {waiting && <section className="tm-alertbar" aria-label={t.alertBarLabel}><span className="tm-alertbar-icon" aria-hidden="true"><TriangleAlert size={26} strokeWidth={2.25} /></span><div className="tm-alertbar-text"><p className="tm-alertbar-what"><span>{waiting.id}</span>{copy.resident} {waiting.id.slice(-3)} {copy.waiting}</p><p className="tm-alertbar-meta">{copy.reason} · No. {waiting.number}, {waiting.street}</p></div><div className="tm-alertbar-actions"><button type="button" className="tm-alertbar-ack" onClick={tab === 'history' ? () => setTab('live') : accept}>{tab === 'history' ? t.openLive : t.checkNowButton}</button></div></section>}
    <section id="tm-panel-live" role="tabpanel" aria-labelledby="tm-tab-live" hidden={tab !== 'live'} className="tm-live-panel">
      <header className="tm-toolbar"><div className="tm-title"><h1>Ilham Residence 3</h1><p>{copy.summary}<span className="lt-demo-stamp">{copy.demo} · 10:40 MYT</span></p></div><div className="tm-chips" role="group" aria-label={t.showOnly}>{filter && <button className="tm-clear" onClick={() => setFilter(null)}><X size={14} aria-hidden="true" />{t.showAll}</button>}{(['unresolved_concern', 'unusual_inactivity'] as const).map(status => {
        const count = attention.filter(h => attentionStatus(h) === status).length
        const Icon = status === 'unresolved_concern' ? TriangleAlert : PhoneCall
        return <button key={status} type="button" className={`tm-chip s-${status} ${filter === status ? 'is-active' : ''} ${count ? '' : 'is-zero'} ${filter && filter !== status ? 'is-dimmed' : ''}`} aria-pressed={filter === status} onClick={() => setFilter(current => current === status ? null : status)}><span className="tm-chip-swatch" aria-hidden="true"><Icon size={16} strokeWidth={2.25} /></span><span className="tm-chip-count">{count}</span><span className="tm-chip-text"><strong>{t.status[status]}</strong><small>{t.chipMeaning[status]}</small></span></button>
      })}</div></header>
      <div className="tm-layout lt-layout">
        <section className="lt-map-column" aria-label="Ilham Residence 3 neighbourhood map">
        <div className="lt-map-tools"><div className="lt-map-search"><label className="tm-sr" htmlFor="lt-home-search">{copy.searchLabel}</label><div className="tm-search"><Search size={15} aria-hidden="true" /><input id="lt-home-search" ref={search} type="search" value={query} placeholder={copy.search} aria-keyshortcuts="/" onChange={e => { setQuery(e.target.value); setQueryMsg('') }} onKeyDown={e => { if (e.key === 'Enter') jump(); if (e.key === 'Escape') e.currentTarget.blur() }} /><kbd aria-hidden="true">/</kbd></div><p className="tm-search-msg" role="status">{queryMsg}</p></div><div className="lt-map-views" role="group" aria-label="Map view">{(['3d', 'top', 'plan'] as const).map(v => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === '3d' ? copy.three : v === 'top' ? copy.top : copy.plan}</button>)}</div></div>
        <div className="lt-map-stage">{view === 'plan' ? <figure className="lt-official-plan"><img src="/images/township/ilham-residence-3-official-plan.png" alt="Official Ilham Residence 3 neighbourhood plan from the Sime Darby Property brochure" width="1630" height="865" /><figcaption>{copy.source} · <a href={officialBrochure} target="_blank" rel="noreferrer">{copy.sourceLink}</a></figcaption></figure> : unavailable ? <div className="lt-scene-message" role="alert"><p>{copy.unavailable}</p><button onClick={() => setView('plan')}>{copy.openPlan}</button></div> : <SceneBoundary copy={copy} onFallback={() => setView('plan')}><Suspense fallback={<p className="lt-scene-message" role="status">{copy.loading}</p>}><LandedScene homes={homes} selected={selected} filter={filter} top={view === 'top'} zoom={zoom} reset={reset} labels={labels} onUnavailable={() => setUnavailable(true)} /></Suspense></SceneBoundary>}
          {view !== 'plan' && !unavailable && <div className="lt-label-layer" ref={labels}><svg className="lt-label-leaders" aria-hidden="true">{attention.filter(h => !filter || attentionStatus(h) === filter).map(h => <line key={h.id} data-map-leader={h.id} stroke="#8b4429" strokeWidth="1" />)}</svg><span className="lt-place-label" data-map-x="65" data-map-z="1">{copy.guardhouse}</span><span className="lt-place-label" data-map-x="35" data-map-z="20">{copy.courtyard}</span>{attention.filter(h => !filter || attentionStatus(h) === filter).map(h => {
            const Icon = h.status === 'inactivity' ? PhoneCall : TriangleAlert
            return <button key={h.id} data-home-id={h.id} data-map-x={h.x} data-map-z={h.z} className={`lt-map-pin s-${attentionStatus(h)} ${h.id === selected ? 'is-selected' : ''}`} aria-label={`${h.id}, ${t.status[attentionStatus(h)]}`} aria-pressed={h.id === selected} onClick={() => select(h.id)}><Icon size={15} aria-hidden="true" /><strong>{h.id}</strong><span>{h.status === 'checking' ? t.checkingTag : h.status === 'inactivity' ? <><Timer size={12} aria-hidden="true" />{h.gap}</> : t.checkNow}</span></button>
          })}</div>}
          {view !== 'plan' && <><div className="lt-map-controls"><button aria-label="Zoom in" disabled={zoom >= 1.7} onClick={() => setZoom(v => Math.min(1.7, v + .15))}><Plus size={18} aria-hidden="true" /></button><button aria-label="Zoom out" disabled={zoom <= .7} onClick={() => setZoom(v => Math.max(.7, v - .15))}><Minus size={18} aria-hidden="true" /></button><button aria-label="Reset map view" onClick={() => { setZoom(1); setReset(v => v + 1) }}><RotateCcw size={17} aria-hidden="true" /></button></div><span className="lt-map-help">{copy.mapHint}</span></>}
        </div><div className="lt-map-caption"><p>{copy.guardOnDuty}</p><div className="lt-legend"><span className="s-unresolved_concern"><i />{t.status.unresolved_concern}</span><span className="s-unusual_inactivity"><i />{t.status.unusual_inactivity}</span><span className="s-routine"><i />{copy.neutral}</span></div><small>{copy.mapNote}</small></div>
      </section><aside className="tm-aside" aria-label={t.response}>{home && !dialogOpen && <DemoResponse key={`${home.id}-${session}`} home={home} copy={copy} onOpen={() => setDialogOpen(true)} onSave={save} />}<section className="tm-attention" aria-labelledby="lt-attention-heading"><div className="tm-attention-head"><h2 id="lt-attention-heading">{t.needsAttention}</h2><span className={attention.some(h => h.status !== 'inactivity') ? 'is-urgent' : ''}>{attention.length}</span></div>{attention.length ? <ul className="tm-attention-list">{attention.map(h => {
        const Icon = h.status === 'inactivity' ? PhoneCall : TriangleAlert
        return <li key={h.id}><button className={`tm-attention-item s-${attentionStatus(h)}`} data-attention={h.id} aria-current={selected === h.id ? 'true' : undefined} onClick={() => select(h.id)}><Icon className="tm-attention-icon" size={16} aria-hidden="true" /><span className="tm-attention-who"><strong>{h.id}</strong><span>Ilham {h.street.split(' ').at(-1)}</span></span><span className="tm-attention-tag">{h.status === 'checking' ? t.checkingTag : h.status === 'inactivity' ? <><Timer size={12} aria-hidden="true" />{h.gap}</> : t.checkNow}</span><ChevronRight size={16} aria-hidden="true" /></button></li>
      })}</ul> : <p className="tm-empty">{t.noAttention}</p>}</section></aside></div>
    </section>
    <IncidentHistory incidents={historyIncidents} units={historyUnits} now={Date.parse('2026-11-09T10:40:00+08:00')} connected active={tab === 'history'} snapshotRevision={session} sourceLabel={copy.note} />
    <footer className="lt-demo-footer"><p role="status" aria-live="polite">{notice || copy.note}</p><button onClick={restart}><RotateCcw size={14} aria-hidden="true" />{copy.reset}</button></footer>
    <CheckDialog open={dialogOpen && !!home} onClose={() => setDialogOpen(false)}>{dialogOpen && home && <DemoResponse key={`${home.id}-${session}-dialog`} home={home} copy={copy} dialog onClose={() => setDialogOpen(false)} onOpen={() => setDialogOpen(true)} onSave={save} />}</CheckDialog>
  </div></TownshipShell>
}
