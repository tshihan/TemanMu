import { useEffect, useLayoutEffect, useState } from 'react'
import { loadUnitReadings, useAppState } from '../api/store'
import type { Reading, Sensor, Status, Unit } from '../api/types'
import { HomeIllustration } from './HomeIllustration'
import { IncidentPanel } from './IncidentPanel'

type Screen = 'floors' | 'homes' | 'detail'
const statusLabels: Record<Status, string> = {
  routine: 'Normal',
  possible_away: 'Possible Away',
  unusual_inactivity: 'Unusual Inactivity',
  unresolved_concern: 'Unresolved Concern',
}
const signalLabels: Record<Sensor, string> = { water: 'Water', electricity: 'Electricity', door: 'Front door' }
const signalSymbols: Record<Sensor, string> = { water: '◉', electricity: 'ϟ', door: '▣' }

function timeLabel(iso: string | null): string {
  if (!iso) return 'No event yet'
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso))
}

function duration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

function currentSignal(unit: Unit, sensor: Sensor): string {
  if (sensor === 'water') return `${unit.latest.water_lpm} L/min`
  if (sensor === 'electricity') return `${unit.latest.power_kw} kW`
  return unit.latest.door === 'open' ? 'Open' : 'Closed'
}

function readingValue(reading: Reading): string {
  if (reading.sensor === 'water') return `${reading.value} L/min`
  if (reading.sensor === 'electricity') return `${reading.value} kW`
  return String(reading.value)
}

export function TownshipView() {
  const { units, incidents, notifications, readingsByUnit, snapshotRevision } = useAppState()
  const [screen, setScreen] = useState<Screen>('floors')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [clock, setClock] = useState(() => Date.now())
  const [readingsError, setReadingsError] = useState<string | null>(null)
  const selected = units.find(unit => unit.unit_id === selectedId)
  const readings = selectedId ? readingsByUnit[selectedId] || [] : []

  useLayoutEffect(() => {
    document.querySelector('.dashboard-content')?.scrollTo({ top: 0 })
  }, [screen, selectedId])

  useEffect(() => {
    if (screen !== 'detail' || !selectedId) return
    void loadUnitReadings(selectedId, snapshotRevision).catch(() => setReadingsError('Could not load the reading timeline.'))
  }, [screen, selectedId, snapshotRevision])
  useEffect(() => {
    if (screen !== 'detail') return
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [screen])

  if (screen === 'floors') return <div className="township-screen">
    <div className="building-list" aria-label="Floors in housing block A">
      {[4, 3, 2, 1].map(floor => floor === 1 ?
        <button key={floor} type="button" className="floor-card floor-active" onClick={() => setScreen('homes')} aria-label={`Open Floor 1, ${units.length} enrolled homes`}>
          <span className="floor-number">01</span>
          <span className="floor-windows" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</span>
          <span className="floor-copy"><strong>Floor 1</strong><small>{units.length} enrolled homes</small></span>
          <span className="floor-arrow" aria-hidden="true">→</span>
        </button> :
        <div key={floor} className="floor-card floor-empty" aria-label={`Floor ${floor}`}>
          <span className="floor-number">0{floor}</span>
          <span className="floor-windows" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</span>
          <span className="floor-copy"><strong>Floor {floor}</strong></span>
          <span className="floor-empty-mark" aria-hidden="true">—</span>
        </div>)}
    </div>
  </div>

  if (screen === 'homes') {
    const ordered = [...units].sort((a, b) => Number(b.status === 'unresolved_concern') - Number(a.status === 'unresolved_concern'))
    return <div className="township-screen">
      <button type="button" className="back-link" onClick={() => setScreen('floors')}>← All floors</button>
      <div className="township-intro compact">
        <p className="eyebrow">Housing block A · Floor 1</p>
        <h3>Enrolled <em>homes</em></h3>
        <p>Select a home to see its utility signals and status reason.</p>
      </div>
      <div className="home-grid">
        {ordered.map(unit => <button key={unit.unit_id} type="button" className={`home-card home-card-${unit.status} ${unit.controllable ? 'home-card-demo' : ''}`}
          onClick={() => { setReadingsError(null); setSelectedId(unit.unit_id); setScreen('detail') }}
          aria-label={`Open unit ${unit.unit_id}, ${unit.resident_name}, ${statusLabels[unit.status]}`}>
          <span className="home-art-wrap"><HomeIllustration status={unit.status} unitId={unit.unit_id} /></span>
          <span className="home-card-info"><strong>{unit.unit_id}</strong>{unit.status !== 'routine' && <span className={`status-pill status-${unit.status}`}>{statusLabels[unit.status]}</span>}</span>
          <span className="home-card-name">{unit.resident_name}</span>
          {unit.controllable && <span className="home-card-caption">Simulated home</span>}
        </button>)}
      </div>
    </div>
  }

  if (!selected) return <div className="township-screen"><button type="button" className="back-link" onClick={() => setScreen('homes')}>← Floor 1 homes</button><p>Unit is unavailable.</p></div>

  const lastWater = selected.quiet_gap.last_water_activity_at
  const elapsed = lastWater ? Math.max(0, (clock - new Date(lastWater).getTime()) / 1000) : 0
  const maximum = selected.quiet_gap.usual_max_seconds
  const exceeded = elapsed > maximum
  const incident = incidents.find(item => item.incident_id === selected.active_incident_id) ||
    [...incidents].filter(item => item.unit_id === selected.unit_id).sort((a, b) => b.opened_at.localeCompare(a.opened_at))[0] || null
  const reassurance = notifications.find(item => item.unit_id === selected.unit_id && item.kind === 'morning_reassurance')

  return <div className="township-screen detail-screen">
    <button type="button" className="back-link" onClick={() => setScreen('homes')}>← Floor 1 homes</button>
    <div className="detail-hero">
      <div className="detail-home-art"><HomeIllustration status={selected.status} unitId={selected.unit_id} /></div>
      <div className="detail-hero-copy">
        <p className="eyebrow">Floor 1 · Unit {selected.unit_id}</p>
        <h3>{selected.resident_name}</h3>
        <span className={`status-pill status-${selected.status}`}>{statusLabels[selected.status]}</span>
        {selected.controllable && <small>Connected to the simulated home</small>}
      </div>
    </div>

    <section className="detail-section reason-card" aria-labelledby="reason-heading">
      <p className="eyebrow">Current assessment</p>
      <h4 id="reason-heading">Why this status?</h4>
      <p>{selected.status_reason}</p>
      <small>Updated {timeLabel(selected.status_since)}</small>
    </section>

    <section className="detail-section" aria-labelledby="gap-heading">
      <div className="detail-section-title"><h4 id="gap-heading">Water quiet gap</h4><span>{duration(elapsed)} / usual {duration(maximum)}</span></div>
      <div className={`quiet-track ${exceeded ? 'is-exceeded' : ''}`} role="progressbar" aria-label="Water quiet gap" aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={Math.min(maximum, Math.floor(elapsed))}>
        <span style={{ width: `${Math.min(100, elapsed / Math.max(maximum, 1) * 100)}%` }} />
      </div>
    </section>

    <section className="detail-section" aria-labelledby="signals-heading">
      <div className="detail-section-title"><h4 id="signals-heading">Utility signals</h4><span>Live readings</span></div>
      {readingsError && <p role="alert" className="reading-error">{readingsError}</p>}
      <div className="signal-grid">
        {(['water', 'electricity', 'door'] as Sensor[]).map(sensor => {
          const events = readings.filter(item => item.sensor === sensor).slice(-3).reverse()
          return <article className="signal-card" key={sensor}>
            <div className="signal-head"><span className="signal-symbol" aria-hidden="true">{signalSymbols[sensor]}</span><strong>{signalLabels[sensor]}</strong></div>
            <p className="signal-current">{currentSignal(selected, sensor)}</p>
            {events.length > 0 && <div className="signal-events" aria-label={`${signalLabels[sensor]} timeline`}>
              {events.map((event, index) => <div key={`${event.recorded_at}-${index}`}><time dateTime={event.recorded_at}>{timeLabel(event.recorded_at)}</time><span>{readingValue(event)}</span></div>)}
            </div>}
          </article>
        })}
      </div>
    </section>

    <IncidentPanel key={incident?.incident_id || 'empty'} incident={incident} unit={selected} role="township" />
    {!incident && reassurance && <p className="detail-hint">Latest reassurance: {reassurance.message}</p>}
  </div>
}
