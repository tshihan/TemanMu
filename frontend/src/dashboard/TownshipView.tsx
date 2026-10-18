import { useEffect, useRef, useState } from 'react'
import seed from '../../../shared/seed.json'
import { useAppState } from '../api/store'
import type { Incident, Status, Unit } from '../api/types'
import { IncidentPanel } from './IncidentPanel'
import './township.css'

type Shown = Status | 'none'
interface Look { label: string; glyph: string; glyphColor: string; chipBg: string; chipFg: string; pane: string; glow: string; border: string; tileBg: string; bar: string; mull: string; map: string }
const STATUS: Record<Shown, Look> = {
  routine: { label: 'No action needed', glyph: '●', glyphColor: '#8d847a', chipBg: '#ede3d6', chipFg: '#515151', pane: '#cdbda3', glow: 'none', border: '#d1c9bf', tileBg: '#fef9ef', bar: '#b5a68e', mull: '#bba98d', map: '#c3b298' },
  possible_away: { label: 'Possible Away', glyph: '○', glyphColor: '#5d6872', chipBg: '#e5ded5', chipFg: '#333333', pane: '#3a4f5f', glow: 'none', border: '#d1c9bf', tileBg: '#fef9ef', bar: '#9aa3a8', mull: '#2a3a47', map: '#3a4f5f' },
  unusual_inactivity: { label: 'Unusual Inactivity', glyph: '▲', glyphColor: '#a95f14', chipBg: '#f6dcc0', chipFg: '#6f321d', pane: '#e8892e', glow: '0 0 14px #e8892e99', border: '#d98a3a', tileBg: '#fbefdf', bar: '#d98a3a', mull: '#c27424', map: '#e8892e' },
  unresolved_concern: { label: 'Unresolved Concern', glyph: '◆', glyphColor: '#b05a36', chipBg: '#b05a36', chipFg: '#fef9ef', pane: '#b05a36', glow: '0 0 14px #b05a3699', border: '#8b4429', tileBg: '#f4e4d7', bar: '#b05a36', mull: '#8b4429', map: '#b05a36' },
  none: { label: 'Not enrolled', glyph: '–', glyphColor: '#a89e92', chipBg: '#ede3d6', chipFg: '#515151', pane: 'repeating-linear-gradient(135deg,#e9dfd0 0 6px,#f5eee1 6px 12px)', glow: 'none', border: '#e2d9cb', tileBg: '#f8f2e7', bar: 'transparent', mull: 'transparent', map: '#ddd3c4' },
}
const ORDER: Shown[] = ['unresolved_concern', 'unusual_inactivity', 'possible_away', 'routine', 'none']
type AlertStatus = 'unresolved_concern' | 'unusual_inactivity'
const CHIP_LABELS: Record<AlertStatus, string> = { unresolved_concern: 'Concern', unusual_inactivity: 'Inactive' }
const isAlert = (status: Shown): status is AlertStatus => status === 'unresolved_concern' || status === 'unusual_inactivity'

// Only floor 1 is backed by the live store; the rest of Block A is illustrative sample data.
const FLOORS = 24
const SAMPLE_ALERTS: Record<string, { status: Shown; start: number }> = { 'A-1204': { status: 'unusual_inactivity', start: 70 }, 'A-2106': { status: 'unusual_inactivity', start: 160 } }
const responder = seed.responders.township

interface Row {
  id: string; floor: number; short: string
  status: Shown; usual: number; elapsed: number
  unit?: Unit
}

const pad = (n: number) => String(n).padStart(2, '0')
const duration = (seconds: number) => { const s = Math.max(0, Math.floor(seconds)); return `${Math.floor(s / 60)}:${pad(s % 60)}` }
const clockTime = (time: number | string) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date(time))
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`
const TITLES: Record<string, string> = { Madam: 'Mdm', Puan: 'Pn', Encik: 'En' }
function shortName(name: string): string {
  const [title, first] = name.split(' ')
  return first ? `${TITLES[title] || title} ${first}` : name
}

function sampleRows(start: number, now: number): Row[] {
  const rows: Row[] = []
  for (let floor = 2; floor <= FLOORS; floor++) for (let i = 1; i <= 6; i++) {
    const id = `A-${floor}${pad(i)}`
    const alert = SAMPLE_ALERTS[id]
    const offset = alert?.start ?? (i * 7 + floor * 3) % 30
    const seconds = offset + (now - start) / 1000
    rows.push({
      id, floor, short: alert ? 'Sample' : '', status: alert?.status ?? 'routine',
      usual: 40, elapsed: alert ? seconds : seconds % 34,
    })
  }
  return rows
}

function liveRow(unit: Unit, now: number): Row {
  const lastWater = unit.quiet_gap.last_water_activity_at
  const usual = unit.quiet_gap.usual_max_seconds
  const raw = lastWater ? Math.max(0, (now - new Date(lastWater).getTime()) / 1000) : 0
  const alert = isAlert(unit.status)
  return {
    id: unit.unit_id, floor: 1, short: shortName(unit.resident_name),
    // Like the design, only units that need a response stand out; everything else reads as "no action needed".
    status: alert ? unit.status : 'routine',
    usual, elapsed: alert || unit.controllable ? raw : raw % Math.max(6, usual * 0.85),
    unit,
  }
}

export function TownshipView() {
  const { units, incidents } = useAppState()
  const start = useRef(Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [selected, setSelected] = useState(() => units.find(unit => unit.controllable)?.unit_id || 'A-105')
  const [focus, setFocus] = useState(1)
  const [filter, setFilter] = useState<AlertStatus | null>(null)
  const [query, setQuery] = useState('')
  const [queryMsg, setQueryMsg] = useState('')
  const [minimizedResponseId, setMinimizedResponseId] = useState<string | null>(null)
  const responseHeading = useRef<HTMLHeadingElement>(null)

  const step = (delta: number) => setFocus(current => Math.max(1, Math.min(FLOORS, current + delta)))
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return
      if (event.target instanceof HTMLElement && event.target.closest('[role="dialog"]')) return
      if (event.key === 'ArrowUp') { event.preventDefault(); step(1) }
      if (event.key === 'ArrowDown') { event.preventDefault(); step(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.clearInterval(timer); window.removeEventListener('keydown', onKey) }
  }, [])

  const rows = [...units.map(unit => liveRow(unit, now)), ...sampleRows(start.current, now)]
  const byFloor = (floor: number) => rows.filter(row => row.floor === floor)
  const worst = (list: Row[]) => list.reduce<Shown>((w, row) => ORDER.indexOf(row.status) < ORDER.indexOf(w) ? row.status : w, 'none')
  const alerts = rows.filter(row => isAlert(row.status))
  const dim = (row: Row) => filter && filter !== row.status ? 0.28 : 1
  const select = (row: Row) => { setSelected(row.id); setFocus(row.floor) }

  const top = Math.max(3, Math.min(FLOORS, focus + 1))
  const lensFloors = [top, top - 1, top - 2]
  const aboveAlerts = alerts.filter(row => row.floor > top).length
  const belowAlerts = alerts.filter(row => row.floor < top - 2).length
  const alertFloors = [...new Set(alerts.map(row => row.floor))].sort((a, b) => b - a)
  const attention = [...alerts].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || b.elapsed - a.elapsed)

  const incidentFor = (row: Row): Incident | undefined => row.unit?.active_incident_id
    ? incidents.find(item => item.incident_id === row.unit?.active_incident_id) : undefined
  const ackFor = (row: Row): { name: string; at: number } | null => {
    const by = incidentFor(row)?.acknowledged_by
    if (by) return { name: by.name, at: new Date(by.at).getTime() }
    return null
  }

  const activeIncident = [...incidents].filter(item => ['notified', 'acknowledged'].includes(item.state) && units.some(unit => unit.unit_id === item.unit_id))
    .sort((a, b) => b.opened_at.localeCompare(a.opened_at))[0]
  const activeUnit = activeIncident && units.find(unit => unit.unit_id === activeIncident.unit_id)
  const activeIncidentId = activeIncident?.incident_id
  const responseOpen = !!activeIncidentId && minimizedResponseId !== activeIncidentId
  useEffect(() => {
    if (!responseOpen) return
    responseHeading.current?.focus()
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeIncidentId) setMinimizedResponseId(activeIncidentId)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [responseOpen, activeIncidentId])

  function jump(value: string) {
    const digits = value.replace(/\D/g, '')
    const match = digits.length >= 3 && rows.find(row => row.id.replace(/\D/g, '') === digits)
    if (match) { select(match); setQueryMsg('') }
    else setQueryMsg(digits ? `No unit ${digits} in Block A` : '')
  }

  return <div className="tm-township">
    <div className="tm-toolbar">
      <div className="tm-toolbar-meta">
        <span className="tm-summary">Housing block A · {FLOORS} floors · {FLOORS * 6} condo units</span>
        <span className="tm-live">Live {clockTime(now)}</span>
      </div>
      <div className="tm-chips">
        {filter && <button type="button" className="tm-clear" onClick={() => setFilter(null)}>Show all ×</button>}
        {(['unresolved_concern', 'unusual_inactivity'] as AlertStatus[]).map(key => {
          const count = rows.filter(row => row.status === key).length
          return <button key={key} type="button" className={`tm-chip ${filter === key ? 'is-active' : ''}`} aria-pressed={filter === key}
            style={{ opacity: filter && filter !== key ? 0.45 : 1 }} onClick={() => setFilter(current => current === key ? null : key)}>
            <span className="tm-chip-swatch" style={{ background: count ? STATUS[key].map : '#efe7da' }} />
            <span className="tm-chip-count" style={{ color: count ? 'var(--color-ink)' : '#8d847a' }}>{count}</span>
            <span className="tm-chip-label">{CHIP_LABELS[key]}</span>
          </button>
        })}
      </div>
    </div>

    <div className="tm-layout">
      <section className="tm-card tm-block" aria-label="Block A floor map">
        <div className="tm-block-head"><span>Block A</span><span>{FLOORS} floors</span></div>
        <div className="tm-search">
          <input type="text" value={query} placeholder="Go to unit, e.g. 1204" aria-label="Go to unit"
            onChange={event => { setQuery(event.target.value); setQueryMsg('') }}
            onKeyDown={event => { if (event.key === 'Enter') jump(event.currentTarget.value) }} />
          {queryMsg && <span role="status">{queryMsg}</span>}
        </div>
        <div className="tm-roof" aria-hidden="true"><span /><span /></div>
        <div className="tm-map">
          {Array.from({ length: FLOORS }, (_, index) => FLOORS - index).map(floor => {
            const list = byFloor(floor)
            const w = worst(list)
            const hasAlert = list.some(row => isAlert(row.status))
            return <button key={floor} type="button" onClick={() => setFocus(floor)} aria-label={`Floor ${floor}${hasAlert ? ', has alerts' : ''}`}
              className={`tm-map-row ${lensFloors.includes(floor) ? 'in-lens' : ''} ${floor === focus ? 'is-focus' : ''}`}>
              <span className="tm-map-num">{pad(floor)}</span>
              <span className="tm-map-cells" aria-hidden="true">
                {[...list.slice(0, 3), null, ...list.slice(3)].map((row, index) => row
                  ? <span key={row.id} style={{ background: STATUS[row.status].map, opacity: filter && filter !== row.status ? 0.25 : 1 }} />
                  : <span key={`core-${index}`} style={{ background: '#c6ad8f' }} />)}
              </span>
              <span className="tm-map-mark" style={{ color: STATUS[w].glyphColor }}>{hasAlert ? STATUS[w].glyph : ''}</span>
            </button>
          })}
        </div>
        <div className="tm-ground" aria-hidden="true" />
        <span className="tm-hint">Click a floor or use ↑ ↓ keys. Shaded rows are shown on the right.</span>
      </section>

      <section className="tm-card tm-lens" aria-label={`Floors ${top} to ${top - 2}`}>
        <div className="tm-lens-head">
          <div className="tm-lens-nav">
            <button type="button" onClick={() => step(-1)} disabled={focus <= 1} aria-label="Floor below">▼</button>
            <button type="button" onClick={() => step(1)} disabled={top >= FLOORS} aria-label="Floor above">▲</button>
            <span>Floors {top}–{top - 2}</span>
          </div>
          <div className="tm-alert-floors">
            <span>Alert floors</span>
            {alertFloors.map(floor => {
              const st = STATUS[worst(byFloor(floor))]
              const on = lensFloors.includes(floor)
              return <button key={floor} type="button" className="tm-alert-floor"
                style={{ background: on ? 'var(--color-ink)' : st.chipBg, color: on ? 'var(--color-parchment)' : st.chipFg, borderColor: on ? 'var(--color-ink)' : st.border }}
                onClick={() => { const first = alerts.find(row => row.floor === floor); if (first) select(first) }}>
                <span aria-hidden="true">{st.glyph}</span>Floor {floor}
              </button>
            })}
            {alertFloors.length === 0 && <span style={{ color: '#5f7f4f' }}>None</span>}
          </div>
        </div>

        {top === FLOORS && <div className="tm-row" aria-hidden="true"><div /><div className="tm-lens-roof"><span /><span /></div></div>}
        {top < FLOORS && <button type="button" className="tm-more above" onClick={() => step(1)}>
          {plural(FLOORS - top, 'floor')} above{aboveAlerts ? ` · ${plural(aboveAlerts, 'alert')}` : ' · all clear'}  ▲
        </button>}
        <div>
          {lensFloors.map(floor => {
            const list = byFloor(floor)
            const count = list.filter(row => isAlert(row.status)).length
            return <div key={floor} className="tm-row">
              <div className="tm-floor-label">
                <span>Floor</span>
                <span className={`tm-floor-num ${floor === focus ? 'is-focus' : ''}`}>{pad(floor)}</span>
                <span className="tm-floor-units">{list.length} units</span>
                {count > 0 && <span className="tm-floor-alert">{plural(count, 'alert')}</span>}
              </div>
              <div className="tm-floor">
                {[...list.slice(0, 3), null, ...list.slice(3)].map((row, index) => {
                  if (!row) return <div key={`core-${index}`} className="tm-core" aria-hidden="true" />
                  const st = STATUS[row.status]
                  const alert = isAlert(row.status)
                  return <button key={row.id} type="button" onClick={() => select(row)}
                    className={`tm-unit ${selected === row.id ? 'is-selected' : ''}`} aria-pressed={selected === row.id}
                    aria-label={`Unit ${row.id}, ${st.label}`}
                    style={{ borderColor: st.border, background: st.tileBg, opacity: dim(row) }}>
                    {alert && <span className="tm-unit-pulse" style={{ borderColor: st.bar }} aria-hidden="true" />}
                    <span className="tm-pane" style={{ background: st.pane, boxShadow: st.glow, ['--mull' as string]: st.mull }}>
                      <i /><i />
                      <span className="tm-pane-glyph" style={{ color: st.glyphColor }} aria-hidden="true">{st.glyph}</span>
                    </span>
                    <span className="tm-unit-id">{row.id}</span>
                    <span className={`tm-unit-tag ${alert ? 'is-alert' : ''}`}>{row.status === 'unusual_inactivity' ? `⏱ ${duration(row.elapsed)}` : alert ? 'Check' : ''}</span>
                    <span className="tm-unit-bar"><span style={{ width: `${Math.min(100, row.elapsed / Math.max(row.usual, 1) * 100)}%`, background: st.bar }} /></span>
                  </button>
                })}
              </div>
            </div>
          })}
        </div>
        {top - 2 > 1 && <button type="button" className="tm-more below" onClick={() => step(-1)}>
          {plural(top - 3, 'floor')} below{belowAlerts ? ` · ${plural(belowAlerts, 'alert')}` : ' · all clear'}  ▼
        </button>}
        {top - 2 === 1 && <div className="tm-row">
          <div style={{ display: 'flex', alignItems: 'center' }}><span className="tm-floor-num" style={{ color: 'var(--color-graphite)' }}>G</span></div>
          <div>
            <div className="tm-lobby"><span>Lobby · {responder} on duty</span><span aria-hidden="true" /></div>
            <div className="tm-lobby-ground" aria-hidden="true" />
          </div>
        </div>}
      </section>

      <aside className="tm-aside">
        <section className="tm-card tm-attention" aria-labelledby="tm-attention-heading">
          <div className="tm-attention-head"><h4 id="tm-attention-heading">Needs attention</h4><span>{attention.length}</span></div>
          <div className="tm-attention-list">
            {attention.map(row => {
              const st = STATUS[row.status]
              return <button key={row.id} type="button" className="tm-attention-item" onClick={() => select(row)}
                style={{ borderColor: st.border, background: row.status === 'unresolved_concern' ? 'var(--color-terracotta-wash)' : '#fbefdf' }}>
                <span style={{ color: st.glyphColor }} aria-hidden="true">{st.glyph}</span>
                <span className="tm-attention-who"><strong>{row.id}</strong><span>{row.short}{ackFor(row) ? ` · ${ackFor(row)?.name} checking` : ''}</span></span>
                <span className="tm-attention-tag">{row.status === 'unresolved_concern' ? 'Check' : `⏱ ${duration(row.elapsed)}`}</span>
                <span aria-hidden="true">→</span>
              </button>
            })}
            {attention.length === 0 && <p className="tm-empty">All enrolled homes are within their usual routine.</p>}
          </div>
        </section>

        {activeIncident && activeUnit && !responseOpen && <button type="button" className="tm-response-entry"
          onClick={() => { const row = rows.find(item => item.id === activeUnit.unit_id); if (row) select(row); setMinimizedResponseId(null) }}>
          <span><strong>Incident response · {activeUnit.unit_id}</strong><small>{activeIncident.state === 'acknowledged' ? 'Awaiting outcome report' : 'Action needed'}</small></span>
          <span aria-hidden="true">Open →</span>
        </button>}
      </aside>
    </div>
    {responseOpen && activeIncident && activeUnit && <div className="tm-response-overlay">
      <div className="tm-response-window" role="dialog" aria-modal="true" aria-labelledby="tm-response-title">
        <div className="tm-response-head">
          <div><p>Unit {activeUnit.unit_id} · {activeUnit.resident_name}</p><h2 id="tm-response-title" tabIndex={-1} ref={responseHeading}>Incident response</h2></div>
          <button type="button" onClick={() => setMinimizedResponseId(activeIncident.incident_id)} aria-label="Minimise incident response">Minimise</button>
        </div>
        <div className="tm-response-body">
          <IncidentPanel key={activeIncident.incident_id} incident={activeIncident} unit={activeUnit} role="township" />
        </div>
      </div>
    </div>}
  </div>
}
