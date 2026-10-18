import { useEffect, useState } from 'react'
import { loadUnitReadings, useAppState } from '../api/store'
import type { Reading, Sensor, Unit } from '../api/types'
import { IncidentPanel } from './IncidentPanel'

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

/** Assessment, quiet gap, utility signals and incident response for one unit, shared by the township views. */
export function UnitDetailSections({ unit }: { unit: Unit }) {
  const { incidents, notifications, readingsByUnit, snapshotRevision } = useAppState()
  const [clock, setClock] = useState(() => Date.now())
  const [readingsError, setReadingsError] = useState<string | null>(null)
  const readings = readingsByUnit[unit.unit_id] || []

  useEffect(() => {
    void loadUnitReadings(unit.unit_id, snapshotRevision).catch(() => setReadingsError('Could not load the reading timeline.'))
  }, [unit.unit_id, snapshotRevision])
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const lastWater = unit.quiet_gap.last_water_activity_at
  const elapsed = lastWater ? Math.max(0, (clock - new Date(lastWater).getTime()) / 1000) : 0
  const maximum = unit.quiet_gap.usual_max_seconds
  const exceeded = elapsed > maximum
  const incident = incidents.find(item => item.incident_id === unit.active_incident_id) ||
    [...incidents].filter(item => item.unit_id === unit.unit_id).sort((a, b) => b.opened_at.localeCompare(a.opened_at))[0] || null
  const reassurance = notifications.find(item => item.unit_id === unit.unit_id && item.kind === 'morning_reassurance')

  return <>
    <section className="detail-section reason-card" aria-labelledby="reason-heading">
      <p className="eyebrow">Current assessment</p>
      <h4 id="reason-heading">Why this status?</h4>
      <p>{unit.status_reason}</p>
      <small>Updated {timeLabel(unit.status_since)}</small>
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
            <p className="signal-current">{currentSignal(unit, sensor)}</p>
            {events.length > 0 && <div className="signal-events" aria-label={`${signalLabels[sensor]} timeline`}>
              {events.map((event, index) => <div key={`${event.recorded_at}-${index}`}><time dateTime={event.recorded_at}>{timeLabel(event.recorded_at)}</time><span>{readingValue(event)}</span></div>)}
            </div>}
          </article>
        })}
      </div>
    </section>

    <IncidentPanel key={incident?.incident_id || 'empty'} incident={incident} unit={unit} role="township" />
    {!incident && reassurance && <p className="detail-hint">Latest reassurance: {reassurance.message}</p>}
  </>
}
