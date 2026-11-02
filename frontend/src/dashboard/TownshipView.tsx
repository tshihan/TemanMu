import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, ChevronUp, DoorOpen, PhoneCall, Search, Timer, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import seed from '../../../shared/seed.json'
import { useAppState } from '../api/store'
import type { Incident, Status, Unit } from '../api/types'
import { playTone, unlockAudio } from '../caregiver/sound'
import { Acknowledge, IncidentPanel, alertReason } from './IncidentPanel'
import { isHomeCheck } from '../caregiver/copy'
import './township.css'

type Shown = Status | 'none'
// Colours live in township.css as `.s-<status>` classes; this keeps the words and icons.
const STATUS: Record<Shown, { label: string; Icon?: LucideIcon }> = {
  routine: { label: 'No action needed' },
  possible_away: { label: 'Possible away', Icon: DoorOpen },
  unusual_inactivity: { label: 'Unusual inactivity', Icon: PhoneCall },
  unresolved_concern: { label: 'Unresolved concern', Icon: TriangleAlert },
  none: { label: 'Not enrolled' },
}
const ORDER: Shown[] = ['unresolved_concern', 'unusual_inactivity', 'possible_away', 'routine', 'none']
type AlertStatus = 'unresolved_concern' | 'unusual_inactivity'
// The filter chips double as the legend: what each alert level means for the guard.
const CHIPS: Record<AlertStatus, { label: string; meaning: string }> = {
  unresolved_concern: { label: 'Unresolved concern', meaning: 'Family and guard alerted' },
  unusual_inactivity: { label: 'Unusual inactivity', meaning: 'TemanMu is calling her' },
}
const isAlert = (status: Shown): status is AlertStatus => status === 'unresolved_concern' || status === 'unusual_inactivity'

// Only floor 1 is backed by the live store; the rest of Block A is illustrative sample data.
const FLOORS = 24
const UNITS_PER_FLOOR = 6
const SAMPLE_ALERTS: Record<string, { status: Shown; start: number; name: string }> = {
  'A-1204': { status: 'unusual_inactivity', start: 70, name: 'Mr Lim' },
  'A-2106': { status: 'unusual_inactivity', start: 160, name: 'Mdm Wong' },
}
const responder = seed.responders.township

interface Row {
  id: string; floor: number; short: string
  status: Shown; usual: number; elapsed: number
  away?: boolean
  unit?: Unit
}

const pad = (n: number) => String(n).padStart(2, '0')
const duration = (seconds: number) => { const s = Math.max(0, Math.floor(seconds)); return `${Math.floor(s / 60)}:${pad(s % 60)}` }
const clockTime = (time: number | string) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date(time))
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
const TITLES: Record<string, string> = { Madam: 'Mdm', Puan: 'Pn', Encik: 'En' }
function shortName(name: string): string {
  const [title, first] = name.split(' ')
  return first ? `${TITLES[title] || title} ${first}` : name
}

function sampleRows(start: number, now: number): Row[] {
  const rows: Row[] = []
  for (let floor = 2; floor <= FLOORS; floor++) for (let i = 1; i <= UNITS_PER_FLOOR; i++) {
    const id = `A-${floor}${pad(i)}`
    const alert = SAMPLE_ALERTS[id]
    const offset = alert?.start ?? (i * 7 + floor * 3) % 30
    const seconds = offset + (now - start) / 1000
    rows.push({
      id, floor, short: alert?.name ?? '', status: alert?.status ?? 'routine',
      usual: 40, elapsed: alert ? seconds : seconds % 34,
    })
  }
  return rows
}

function liveRow(unit: Unit, now: number): Row {
  const lastWater = unit.quiet_gap.last_water_activity_at
  const confirmed = unit.quiet_gap.last_caregiver_confirmation_at
  const anchor = confirmed && (!lastWater || confirmed > lastWater) ? confirmed : lastWater
  const usual = unit.quiet_gap.usual_max_seconds
  const raw = anchor ? Math.max(0, (now - new Date(anchor).getTime()) / 1000) : 0
  const alert = isAlert(unit.status)
  // A caregiver-declared away period: the quiet-gap bar means nothing until the resident is back.
  const away = unit.care_state === 'in_hospital' || unit.away_periods.some(period => Date.parse(period.starts_at) <= now && now < Date.parse(period.ends_at))
  return {
    away,
    id: unit.unit_id, floor: 1, short: shortName(unit.resident_name),
    // Only units that need a response stand out; everything else reads as "no action needed".
    status: alert ? unit.status : 'routine',
    usual, elapsed: away && !alert ? 0 : alert || unit.controllable ? raw : raw % Math.max(6, usual * 0.85),
    unit,
  }
}

/** Seven slots per floor: three units, the lift core, three units. */
const withCore = (list: Row[]): (Row | null)[] => [...list.slice(0, 3), null, ...list.slice(3)]

export function TownshipView() {
  const { units, incidents } = useAppState()
  const start = useRef(Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [selected, setSelected] = useState(() => units.find(unit => unit.controllable)?.unit_id || 'A-105')
  const [focus, setFocus] = useState(1)
  const [filter, setFilter] = useState<AlertStatus | null>(null)
  const [query, setQuery] = useState('')
  const [queryMsg, setQueryMsg] = useState('')
  const [heldResponseId, setHeldResponseId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const stepAlert = useRef<(direction: 1 | -1) => void>(() => {})

  const step = (delta: number) => setFocus(current => Math.max(1, Math.min(FLOORS, current + delta)))
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target instanceof HTMLElement ? event.target : document.body
      if (/INPUT|TEXTAREA|SELECT/.test(target.tagName) || target.isContentEditable || target.closest('.tm-resp')) return
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        // Floors move only from the page or the building itself, so arrow keys still scroll elsewhere.
        if (target !== document.body && !target.closest('.tm-block, .tm-lens')) return
        event.preventDefault()
        step(event.key === 'ArrowUp' ? 1 : -1)
      } else if (event.key === 'j' || event.key === 'k') {
        event.preventDefault()
        stepAlert.current(event.key === 'j' ? 1 : -1)
      } else if (event.key === '/') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.clearInterval(timer); window.removeEventListener('keydown', onKey) }
  }, [])

  const rows = [...units.map(unit => liveRow(unit, now)), ...sampleRows(start.current, now)]
  const byFloor = (floor: number) => rows.filter(row => row.floor === floor)
  const worst = (list: Row[]) => list.reduce<Shown>((w, row) => ORDER.indexOf(row.status) < ORDER.indexOf(w) ? row.status : w, 'none')
  const alerts = rows.filter(row => isAlert(row.status))
  const dimmed = (row: Row) => !!filter && filter !== row.status
  const select = (row: Row) => { setSelected(row.id); setFocus(row.floor) }

  const top = Math.max(3, Math.min(FLOORS, focus + 1))
  const lensFloors = [top, top - 1, top - 2]
  const aboveAlerts = alerts.filter(row => row.floor > top).length
  const belowAlerts = alerts.filter(row => row.floor < top - 2).length
  const alertFloors = [...new Set(alerts.map(row => row.floor))].sort((a, b) => b - a)
  const attention = [...alerts].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || b.elapsed - a.elapsed)

  useEffect(() => { stepAlert.current = direction => {
    if (!attention.length) return
    const index = attention.findIndex(row => row.id === selected)
    const next = attention[index < 0 ? (direction === 1 ? 0 : attention.length - 1) : (index + direction + attention.length) % attention.length]
    select(next)
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-attention="${next.id}"]`)?.focus())
  } })

  const incidentFor = (row: Row): Incident | undefined => row.unit?.active_incident_id
    ? incidents.find(item => item.incident_id === row.unit?.active_incident_id) : undefined
  const checkerFor = (row: Row): string | null => incidentFor(row)?.acknowledged_by?.name ?? null

  const liveIncident = [...incidents].filter(item => ['notified', 'acknowledged'].includes(item.state) && units.some(unit => unit.unit_id === item.unit_id))
    .sort((a, b) => b.opened_at.localeCompare(a.opened_at))[0]
  // Once the incident ends, keep its confirmation docked until the guard taps Done.
  const liveId = liveIncident?.incident_id
  if (liveId && heldResponseId !== liveId) setHeldResponseId(liveId)
  const heldIncident = liveIncident ? undefined
    : incidents.find(item => item.incident_id === heldResponseId && ['closed', 'auto_resolved'].includes(item.state))
  const activeIncident = liveIncident ?? heldIncident
  const activeUnit = activeIncident && units.find(unit => unit.unit_id === activeIncident.unit_id)
  const activeRow = activeUnit && rows.find(row => row.id === activeUnit.unit_id)

  // Once Guard Ali says "I'll Check Now", the at-the-door form opens as a pop-up, once per incident.
  // Closing it keeps the same form in the docked panel; the panel can reopen it.
  const [dialogId, setDialogId] = useState<string | null>(null)
  const checkingMine = liveIncident?.state === 'acknowledged' && liveIncident.acknowledged_by?.role === 'township' && liveIncident.acknowledged_by.name === responder
  const dialogOpened = useRef<string | null>(null)
  useEffect(() => {
    if (!checkingMine || !liveId || dialogOpened.current === liveId) return
    dialogOpened.current = liveId
    setDialogId(liveId)
  }, [checkingMine, liveId])
  const dialogOpen = !!activeIncident && dialogId === activeIncident.incident_id
  const finish = () => { setHeldResponseId(null); setDialogId(null) }

  // A new alert brings its floor into view; keyboard focus stays where the guard left it.
  const shownIncident = useRef<string | null>(null)
  useEffect(() => {
    if (!liveId || shownIncident.current === liveId || !activeRow) return
    shownIncident.current = liveId
    select(activeRow)
  }, [liveId, activeRow])

  // A home waiting for a responder must be impossible to miss: a chime, a flashing tab title,
  // and the alert bar below. Browsers allow sound only after the guard has touched the page once.
  const waiting = liveIncident?.state === 'notified' ? liveIncident : undefined
  const reminders = waiting?.reminder_count ?? 0
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  }, [])
  const chimed = useRef<{ id: string; reminders: number } | null>(null)
  useEffect(() => {
    if (!waiting) return
    const last = chimed.current
    if (last?.id !== waiting.incident_id) playTone('alert')
    else if (reminders > last.reminders) playTone('reminder')
    chimed.current = { id: waiting.incident_id, reminders }
  }, [waiting?.incident_id, reminders])
  const waitingUnitId = waiting && activeUnit?.unit_id
  useEffect(() => {
    if (!waitingUnitId) return
    const original = document.title
    const alertTitle = `⚠ ${waitingUnitId} needs a check`
    let on = true
    document.title = alertTitle
    const timer = window.setInterval(() => { on = !on; document.title = on ? alertTitle : original }, 1000)
    return () => { window.clearInterval(timer); document.title = original }
  }, [waitingUnitId])

  const announcement = !liveIncident || !activeUnit ? ''
    : liveIncident.state === 'notified' ? `Alert: unit ${activeUnit.unit_id}, ${activeUnit.resident_name}, needs a responder.`
    : `${liveIncident.acknowledged_by?.name ?? 'A responder'} is checking unit ${activeUnit.unit_id}.`

  function jump(value: string) {
    const text = value.trim()
    const digits = text.replace(/\D/g, '')
    if (!text) { setQueryMsg(''); return }
    if (digits && digits.length < 3) { setQueryMsg('Type the full unit number, e.g. 1204'); return }
    const lower = text.toLowerCase()
    const matches = digits ? rows.filter(row => row.id.replace(/\D/g, '') === digits)
      : rows.filter(row => row.short.toLowerCase().includes(lower) || !!row.unit?.resident_name.toLowerCase().includes(lower))
    if (!matches.length) { setQueryMsg(digits ? `No unit ${digits} in Block A` : `No resident called “${text}”`); return }
    // Enter again steps through residents who share a name.
    const index = (matches.findIndex(row => row.id === selected) + 1) % matches.length
    select(matches[index])
    setQueryMsg(matches.length > 1 ? `${matches[index].id}: ${index + 1} of ${matches.length}. Press Enter for the next.` : '')
  }

  return <div className="tm-township">
    <p className="tm-sr" role="status">{announcement}</p>
    {waiting && activeUnit && <section className="tm-alertbar" aria-label="Alert needing a responder">
      <span className="tm-alertbar-icon" aria-hidden="true"><TriangleAlert size={26} strokeWidth={2.25} /></span>
      <div className="tm-alertbar-text">
        <p className="tm-alertbar-what"><span>{activeUnit.unit_id}</span>{isHomeCheck(waiting) ? `${activeUnit.resident_name}'s home needs a check` : `${activeUnit.resident_name} needs a responder now`}</p>
        <p className="tm-alertbar-meta">{alertReason(waiting, activeUnit)}{!isHomeCheck(waiting) && waiting.events.some(event => event.type === 'township_requested') ? ` · ${activeUnit.caregiver_name} asked you to visit` : ''} · Floor {activeRow?.floor ?? 1} · reminder {waiting.reminder_count + 1} in {waiting.next_reminder_at ? duration((Date.parse(waiting.next_reminder_at) - now) / 1000) : '–'}</p>
      </div>
      <div className="tm-alertbar-actions">
        <Acknowledge key={waiting.incident_id} incident={waiting} className="tm-alertbar-ack" />
        <a className="tm-alertbar-999" href="tel:999">Call 999</a>
      </div>
    </section>}
    <header className="tm-toolbar">
      <div className="tm-title">
        <h1>Unit status</h1>
        <p>Block A · {FLOORS} floors · {FLOORS * UNITS_PER_FLOOR} units<span className="tm-live">Live <time>{clockTime(now)}</time></span></p>
      </div>
      <div className="tm-chips" role="group" aria-label="Show only">
        {filter && <button type="button" className="tm-clear" onClick={() => setFilter(null)}><X size={14} aria-hidden="true" />Show all</button>}
        {(['unresolved_concern', 'unusual_inactivity'] as AlertStatus[]).map(key => {
          const count = rows.filter(row => row.status === key).length
          const Icon = STATUS[key].Icon!
          return <button key={key} type="button" className={`tm-chip s-${key} ${filter === key ? 'is-active' : ''} ${count ? '' : 'is-zero'} ${filter && filter !== key ? 'is-dimmed' : ''}`}
            aria-pressed={filter === key} onClick={() => setFilter(current => current === key ? null : key)}>
            <span className="tm-chip-swatch" aria-hidden="true"><Icon size={16} strokeWidth={2.25} /></span>
            <span className="tm-chip-count">{count}</span>
            <span className="tm-chip-text"><strong>{CHIPS[key].label}</strong><small>{CHIPS[key].meaning}</small></span>
          </button>
        })}
      </div>
    </header>

    <div className="tm-layout">
      <section className="tm-block" aria-label="Block A floor map">
        <div className="tm-search">
          <Search size={15} aria-hidden="true" />
          <input ref={searchRef} type="search" value={query} placeholder="Unit or name" aria-label="Find a unit or resident" aria-keyshortcuts="/"
            onChange={event => { setQuery(event.target.value); setQueryMsg('') }}
            onKeyDown={event => { if (event.key === 'Enter') jump(event.currentTarget.value); if (event.key === 'Escape') event.currentTarget.blur() }} />
          <kbd aria-hidden="true">/</kbd>
        </div>
        <p className="tm-search-msg" role="status">{queryMsg}</p>
        <div className="tm-roof" aria-hidden="true"><span /><span /></div>
        <div className="tm-map">
          {Array.from({ length: FLOORS }, (_, index) => FLOORS - index).map(floor => {
            const list = byFloor(floor)
            const w = worst(list)
            const count = list.filter(row => isAlert(row.status)).length
            const Icon = count ? STATUS[w].Icon : undefined
            return <button key={floor} type="button" onClick={() => setFocus(floor)}
              aria-label={`Floor ${floor}${count ? `, ${plural(count, 'alert')}` : ''}`} aria-current={floor === focus ? 'true' : undefined}
              className={`tm-map-row ${lensFloors.includes(floor) ? 'in-lens' : ''} ${floor === focus ? 'is-focus' : ''}`}>
              <span className="tm-map-num">{pad(floor)}</span>
              <span className="tm-map-cells" aria-hidden="true">
                {withCore(list).map((row, index) => row
                  ? <span key={row.id} className={`s-${row.status} ${dimmed(row) ? 'is-dimmed' : ''}`} />
                  : <span key={`core-${index}`} className="is-core" />)}
              </span>
              <span className={`tm-map-mark s-${w}`} aria-hidden="true">{Icon && <Icon size={12} strokeWidth={2.5} />}</span>
            </button>
          })}
        </div>
        <div className="tm-ground" aria-hidden="true" />
        <p className="tm-keys"><span><kbd>↑</kbd><kbd>↓</kbd> floors</span><span><kbd>J</kbd><kbd>K</kbd> next alert</span></p>
      </section>

      <section className="tm-lens" aria-labelledby="tm-lens-title">
        <div className="tm-lens-head">
          <div className="tm-lens-nav">
            <button type="button" onClick={() => step(-1)} disabled={focus <= 1} aria-label="Floor below"><ChevronDown size={18} aria-hidden="true" /></button>
            <button type="button" onClick={() => step(1)} disabled={top >= FLOORS} aria-label="Floor above"><ChevronUp size={18} aria-hidden="true" /></button>
            <h2 id="tm-lens-title">Floors {top}–{top - 2}</h2>
          </div>
          {alertFloors.length > 0 && <div className="tm-alert-floors" role="group" aria-label="Floors with alerts">
            {alertFloors.map(floor => {
              const w = worst(byFloor(floor))
              const Icon = STATUS[w].Icon
              return <button key={floor} type="button" className={`tm-alert-floor s-${w} ${lensFloors.includes(floor) ? 'is-shown' : ''}`}
                onClick={() => { const first = attention.find(row => row.floor === floor); if (first) select(first) }}>
                {Icon && <Icon size={13} strokeWidth={2.5} aria-hidden="true" />}Floor {floor}
              </button>
            })}
          </div>}
        </div>

        {top === FLOORS && <div className="tm-row" aria-hidden="true"><div /><div className="tm-lens-roof"><span /><span /></div></div>}
        {top < FLOORS && <button type="button" className={`tm-more above ${aboveAlerts ? 'has-alerts' : ''}`} onClick={() => step(1)}>
          <ChevronUp size={14} aria-hidden="true" />{plural(FLOORS - top, 'floor')} above · {aboveAlerts ? plural(aboveAlerts, 'alert') : 'all clear'}
        </button>}
        <div>
          {lensFloors.map(floor => {
            const list = byFloor(floor)
            const count = list.filter(row => isAlert(row.status)).length
            return <div key={floor} className="tm-row">
              <div className="tm-floor-label">
                <span>Floor</span>
                <span className={`tm-floor-num ${floor === focus ? 'is-focus' : ''}`}>{pad(floor)}</span>
                {count > 0 && <span className={`tm-floor-alert s-${worst(list)}`}>{plural(count, 'alert')}</span>}
              </div>
              <div className="tm-floor">
                {withCore(list).map((row, index) => {
                  if (!row) return <div key={`core-${index}`} className="tm-core" aria-hidden="true" />
                  const st = STATUS[row.status]
                  const checker = checkerFor(row)
                  const where = row.unit?.care_state === 'in_hospital' ? 'In hospital' : row.away ? 'Away' : ''
                  const tag = row.status === 'unresolved_concern' ? (checker ? `${checker.split(' ').pop()} checking` : 'Check now')
                    : row.status === 'unusual_inactivity' ? duration(row.elapsed) : where
                  return <button key={row.id} type="button" onClick={() => select(row)}
                    className={`tm-unit s-${row.status} ${selected === row.id ? 'is-selected' : ''} ${dimmed(row) ? 'is-dimmed' : ''} ${checker ? 'is-claimed' : ''}`}
                    aria-pressed={selected === row.id}
                    aria-label={[`Unit ${row.id}`, row.short, st.label,
                      row.status === 'unusual_inactivity' ? `quiet for ${duration(row.elapsed)}` : '',
                      row.status === 'unresolved_concern' ? (checker ? `${checker} is checking` : 'needs a responder') : '',
                      where].filter(Boolean).join(', ')}>
                    {row.status === 'unresolved_concern' && !checker && <span className="tm-unit-pulse" aria-hidden="true" />}
                    <span className="tm-pane" aria-hidden="true">
                      <i /><i />
                      {st.Icon && isAlert(row.status) && <span className="tm-pane-icon"><st.Icon size={12} strokeWidth={2.5} /></span>}
                    </span>
                    <span className="tm-unit-id">{row.id}</span>
                    <span className="tm-unit-tag" aria-hidden="true">
                      {row.status === 'unusual_inactivity' && <Timer size={12} strokeWidth={2.5} />}{tag}
                    </span>
                    <span className="tm-unit-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, row.elapsed / Math.max(row.usual, 1) * 100)}%` }} /></span>
                  </button>
                })}
              </div>
            </div>
          })}
        </div>
        {top - 2 > 1 && <button type="button" className={`tm-more below ${belowAlerts ? 'has-alerts' : ''}`} onClick={() => step(-1)}>
          <ChevronDown size={14} aria-hidden="true" />{plural(top - 3, 'floor')} below · {belowAlerts ? plural(belowAlerts, 'alert') : 'all clear'}
        </button>}
        {top - 2 === 1 && <div className="tm-row">
          <div className="tm-floor-label"><span className="tm-floor-num is-ground">G</span></div>
          <div>
            <div className="tm-lobby"><span>Lobby · {responder} on duty</span><span aria-hidden="true" /></div>
            <div className="tm-lobby-ground" aria-hidden="true" />
          </div>
        </div>}
        <p className="tm-bar-key"><span aria-hidden="true"><span /></span>Each bar shows how long the home has been quiet, against that resident's usual longest gap.</p>
      </section>

      <aside className="tm-aside" aria-label="Response">
        {/* While the check pop-up is open it is the only place the incident shows; the panel returns if the guard closes it. */}
        {activeIncident && activeUnit && !dialogOpen && <IncidentPanel key={activeIncident.incident_id} incident={activeIncident} unit={activeUnit}
          floor={activeRow?.floor ?? 1} onDone={finish} inAlertBar={!!waiting}
          onOpenDialog={() => setDialogId(activeIncident.incident_id)} />}

        <section className="tm-attention" aria-labelledby="tm-attention-heading">
          <div className="tm-attention-head">
            <h2 id="tm-attention-heading">Needs attention</h2>
            <span className={attention.some(row => row.status === 'unresolved_concern') ? 'is-urgent' : ''}>{attention.length}</span>
          </div>
          {attention.length > 0 ? <ul className="tm-attention-list">
            {attention.map(row => {
              const Icon = STATUS[row.status].Icon!
              const checker = checkerFor(row)
              return <li key={row.id}>
                <button type="button" data-attention={row.id} aria-current={selected === row.id ? 'true' : undefined}
                  className={`tm-attention-item s-${row.status}`} onClick={() => select(row)}>
                  <Icon className="tm-attention-icon" size={16} strokeWidth={2.25} aria-hidden="true" />
                  <span className="tm-attention-who"><strong>{row.id}</strong><span>{row.short}{checker ? ` · ${checker} checking` : ''}</span></span>
                  <span className="tm-attention-tag">{row.status === 'unresolved_concern'
                    ? (checker ? 'Checking' : 'Check now')
                    : <><Timer size={12} strokeWidth={2.5} aria-hidden="true" />{duration(row.elapsed)}</>}</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </li>
            })}
          </ul> : <p className="tm-empty">No enrolled homes need a response right now.</p>}
        </section>
      </aside>
    </div>
    <CheckDialog open={dialogOpen} onClose={() => setDialogId(null)}>
      {dialogOpen && activeIncident && activeUnit && <IncidentPanel key={activeIncident.incident_id} incident={activeIncident} unit={activeUnit}
        floor={activeRow?.floor ?? 1} onDone={finish} variant="dialog" onCloseDialog={() => setDialogId(null)} />}
    </CheckDialog>
  </div>
}

/** A native modal dialog: the browser traps focus, makes the page behind inert and closes on Esc. */
function CheckDialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.querySelector<HTMLElement>('h2')?.focus()
    } else if (!open && dialog.open) dialog.close()
  }, [open])
  return <dialog ref={ref} className="tm-check-dialog" aria-labelledby="tm-resp-title-dialog" onClose={onClose}>{children}</dialog>
}
