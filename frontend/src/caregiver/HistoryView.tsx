import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { api } from '../api'
import type { HistoryDay, HistoryInterval, HistoryRange, Unit, UnitHistory } from '../api/types'
import { outcomeLabel, type Ctx } from './copy'
import { clock, dayKey, dayLabel } from './format'

interface Props {
  unit: Unit; ctx: Ctx; now: number
  /** Changes whenever live data may have changed, so the history is fetched again. */
  revision: string
  onBack: () => void; onOpenIncident: (incidentId: string) => void
}

const DAY_MS = 864e5
const AXIS = ['12a', '6a', '12p', '6p', '12a']
const at = (day: HistoryDay, time: string) => Math.min(1, Math.max(0, (Date.parse(time) - Date.parse(day.starts_at)) / DAY_MS))
const hourName = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
const hourRange = (hour: number) => `${hourName(hour)}–${hourName((hour + 1) % 24)}`
const litres = (value: number) => `${value && value < 10 ? value.toFixed(1) : Math.round(value)} L`
const kwh = (value: number) => `${value.toFixed(2)} kWh`
const simulated = (day: HistoryDay) => day.source === 'simulated_history'
// The electricity lane marks hours with use above the home's standby draw.
const poweredHour = (energy: number | null, standby: number) => energy !== null && energy > standby + 0.02

function dayName(day: HistoryDay, now: number): string {
  const noon = Date.parse(day.starts_at) + DAY_MS / 2
  return day.date === dayKey(now) ? 'Today' : day.date === dayKey(now - DAY_MS) ? 'Yesterday' : dayLabel(noon)
}

function span(day: HistoryDay, interval: HistoryInterval): string {
  const fromMidnight = interval.starts_at === day.starts_at
  const toMidnight = interval.ends_at === day.ends_at
  if (fromMidnight && toMidnight) return 'all day'
  if (fromMidnight) return `until ${clock(interval.ends_at)}`
  if (toMidnight) return `from ${clock(interval.starts_at)}`
  return `${clock(interval.starts_at)}–${clock(interval.ends_at)}`
}

function list(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

/** Facts recorded by the sensors only: never how the resident is (phase2.md §5). */
function summary(day: HistoryDay, now: number): string[] {
  const lines: string[] = []
  for (const gap of day.missing)
    lines.push(gap.reason === 'before_demo' ? `No data before the demo started at ${clock(gap.ends_at)}.` : `No meter data ${span(day, gap)}.`)
  const hasData = day.hours.some(hour => hour.water_litres !== null)
  if (day.first_water_at) lines.push(`First water use recorded at ${clock(day.first_water_at)}.`)
  else if (hasData) lines.push(`No water use recorded${day.date === dayKey(now) ? ' so far' : ''}.`)
  const doors = day.door_opened_at.map(time => clock(time))
  if (doors.length > 4) lines.push(`Door opened ${doors.length} times, first at ${doors[0]}.`)
  else if (doors.length) lines.push(`Door opened at ${list(doors)}.`)
  for (const away of day.away) lines.push(`Monitoring paused ${span(day, away)}.`)
  for (const incident of day.incidents) {
    const open = ['grace', 'notified', 'acknowledged'].includes(incident.state)
    lines.push(`Alert at ${clock(incident.opened_at)}: ${open ? 'still open' : outcomeLabel(incident.outcome)}.`)
  }
  return lines
}

/** The day's water, electricity and door activity as lanes, with away, missing and alert bands. */
function Lanes({ day, standby, now, compact = false }: { day: HistoryDay; standby: number; now: number; compact?: boolean }) {
  const isToday = day.date === dayKey(now)
  const band = (interval: HistoryInterval) => ({ left: `${at(day, interval.starts_at) * 100}%`, width: `${(at(day, interval.ends_at) - at(day, interval.starts_at)) * 100}%` })
  return <span className={`cg-hist-lanes ${compact ? 'is-compact' : ''}`} aria-hidden="true">
    {day.away.map(away => <b key={`away-${away.starts_at}`} className="is-away" style={band(away)} />)}
    {day.missing.map(gap => <b key={`gap-${gap.starts_at}`} className="is-missing" style={band(gap)} />)}
    {isToday && <b className="is-future" style={{ left: `${at(day, new Date(now).toISOString()) * 100}%`, right: 0 }} />}
    {day.hours.map(hour => <span key={hour.hour}>
      {!!hour.water_litres && <i className="is-water" style={{ left: `${hour.hour / 24 * 100}%` }} />}
      {poweredHour(hour.energy_kwh, standby) && <i className="is-power" style={{ left: `${hour.hour / 24 * 100}%` }} />}
    </span>)}
    {day.door_opened_at.map(time => <i key={time} className="is-door" style={{ left: `${at(day, time) * 100}%` }} />)}
    {day.incidents.map(incident => <em key={incident.incident_id} style={{ left: `${at(day, incident.opened_at) * 100}%` }} />)}
  </span>
}

function Legend() {
  return <div className="cg-legend cg-hist-legend" aria-hidden="true">
    <span className="is-water">Water</span><span className="is-power">Power</span><span className="is-door">Door</span>
    <span className="is-away">Paused</span><span className="is-missing">No data</span><span className="is-alert">Alert</span>
  </div>
}

function HourChart({ kind, title, values, format, selected, onSelect, now, day, standby }: {
  kind: 'water' | 'power'; title: string; values: (number | null)[]; format: (value: number) => string; selected: number | null
  onSelect: (hour: number) => void; now: number; day: HistoryDay; standby?: number
}) {
  const peak = Math.max(...values.map(value => value ?? 0))
  const scale = Math.max(peak, standby ? standby * 3 : 10)
  const isToday = day.date === dayKey(now)
  const currentHour = Math.floor(at(day, new Date(now).toISOString()) * 24)
  return <section className={`cg-hist-chart is-${kind}`} aria-label={title}>
    <div className="cg-hist-chart-head"><h3>{title}</h3><span className="cg-num">{peak ? `Peak ${format(peak)}` : 'None recorded'}</span></div>
    <div className="cg-hist-bars">
      {standby !== undefined && <span className="cg-hist-standby" style={{ bottom: `${standby / scale * 100}%` }} aria-hidden="true" />}
      {values.map((value, hour) => {
        const later = isToday && hour > currentHour
        const missing = value === null && !later
        return <button key={hour} type="button" aria-pressed={selected === hour} disabled={later}
          className={`${missing ? 'is-missing' : ''} ${selected === hour ? 'is-on' : ''}`}
          aria-label={`${hourRange(hour)}: ${later ? 'later today' : missing ? 'no data' : format(value!)}`} onClick={() => onSelect(hour)}>
          {!!value && <i style={{ height: `max(4px, ${value / scale * 100}%)` }} />}
        </button>
      })}
    </div>
    <div className="cg-axis" aria-hidden="true">{AXIS.map((label, index) => <span key={index}>{label}</span>)}</div>
    {standby !== undefined && <p className="cg-hist-note">Dashed line: the home’s standby use, {kwh(standby)} each hour.</p>}
  </section>
}

function DayDetail({ day, history, ctx, now, onOpenIncident }: { day: HistoryDay; history: UnitHistory; ctx: Ctx; now: number; onOpenIncident: (id: string) => void }) {
  const [hour, setHour] = useState<number | null>(null)
  const selected = hour === null ? null : day.hours[hour]
  const water = day.hours.map(item => item.water_litres)
  const power = day.hours.map(item => item.energy_kwh)
  return <>
    <section className="cg-card cg-hist-day">
      <div className="cg-hist-day-head">
        <h2 className="cg-card-title">{dayName(day, now)}</h2>
        <span className="cg-chip">{simulated(day) ? 'Simulated' : 'Live'}</span>
      </div>
      <p className="cg-card-lead">{summary(day, now).join(' ') || 'No activity recorded yet.'}</p>
      <p className="cg-hist-readout cg-num" role="status">
        {selected ? selected.water_litres === null ? `${hourRange(selected.hour)} · No data`
          : `${hourRange(selected.hour)} · ${litres(selected.water_litres)} water · ${kwh(selected.energy_kwh ?? 0)}`
          : 'Tap an hour to see its values.'}
      </p>
    </section>
    <section className="cg-card">
      <HourChart kind="water" title="Water · litres per hour" values={water} format={litres} selected={hour} onSelect={setHour} now={now} day={day} />
      <HourChart kind="power" title="Electricity · kWh per hour" values={power} format={kwh} selected={hour} onSelect={setHour} now={now} day={day} standby={history.standby_power_kw} />
      <div className="cg-hist-markers">
        <h3>Through the day</h3>
        <Lanes day={day} standby={history.standby_power_kw} now={now} />
        <div className="cg-axis" aria-hidden="true">{AXIS.map((label, index) => <span key={index}>{label}</span>)}</div>
        <Legend />
      </div>
      {day.incidents.length > 0 && <ul className="cg-hist-alerts">
        {day.incidents.map(incident => <li key={incident.incident_id}>
          <button type="button" className="cg-btn cg-btn-outline" disabled={incident.state === 'grace'} onClick={() => onOpenIncident(incident.incident_id)}>
            <TriangleAlert size={18} aria-hidden="true" />
            <span>Alert at {clock(incident.opened_at)} · {['grace', 'notified', 'acknowledged'].includes(incident.state) ? 'Still open' : outcomeLabel(incident.outcome)}</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </li>)}
      </ul>}
      <details className="cg-hist-table">
        <summary>Show as table</summary>
        <table>
          <thead><tr><th scope="col">Hour</th><th scope="col">Water</th><th scope="col">Electricity</th></tr></thead>
          <tbody className="cg-num">{day.hours.map(item => <tr key={item.hour}>
            <th scope="row">{hourRange(item.hour)}</th>
            <td>{item.water_litres === null ? '—' : litres(item.water_litres)}</td>
            <td>{item.energy_kwh === null ? '—' : kwh(item.energy_kwh)}</td>
          </tr>)}</tbody>
        </table>
      </details>
    </section>
    <p className="cg-fineprint">Household water, electricity and door activity only. TemanMu can’t tell who used them or how {ctx.R} is feeling.</p>
  </>
}

/** 7- or 30-day activity history for the caregiver (phase2.md §5). */
export function HistoryView({ unit, ctx, now, revision, onBack, onOpenIncident }: Props) {
  const [range, setRange] = useState<HistoryRange>(7)
  const [history, setHistory] = useState<UnitHistory | null>(null)
  const [failed, setFailed] = useState(false)
  const [date, setDate] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    api.getHistory(unit.unit_id, range)
      .then(result => { if (current) { setHistory(result); setFailed(false) } })
      .catch(() => { if (current) setFailed(true) })
    return () => { current = false }
  }, [unit.unit_id, range, revision])

  const days = history?.days.slice(0, range) ?? []
  const day = days.find(item => item.date === date) ?? null
  // Thirty days are grouped by week, newest first.
  const weeks: { label: string; days: HistoryDay[] }[] = []
  for (const item of days) {
    const noon = Date.parse(item.starts_at) + DAY_MS / 2
    const monday = noon - ((new Date(noon).getUTCDay() + 6) % 7) * DAY_MS
    const label = `Week of ${dayLabel(monday).replace(/^\w+ /, '')}`
    if (weeks.at(-1)?.label === label) weeks.at(-1)!.days.push(item)
    else weeks.push({ label, days: [item] })
  }

  const row = (item: HistoryDay, compact: boolean) => <li key={item.date}>
    <button type="button" className={`cg-hist-row ${compact ? 'is-compact' : ''}`} onClick={() => setDate(item.date)}
      aria-label={`${dayName(item, now)}${simulated(item) ? ', simulated' : ''}. ${summary(item, now).join(' ')}`}>
      <span className="cg-hist-date">
        <strong>{item.date === dayKey(now) ? 'Today' : dayLabel(Date.parse(item.starts_at) + DAY_MS / 2).replace(/ \w+$/, '')}</strong>
        {!compact && <span>{simulated(item) ? 'Simulated' : 'Live'}</span>}
      </span>
      <Lanes day={item} standby={history!.standby_power_kw} now={now} compact={compact} />
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  </li>

  return <div className="cg-sheet cg-hist" role="dialog" aria-label={`${ctx.R}’s activity history`}>
    <div className="cg-sheet-head">
      <button type="button" className="cg-icon-btn" onClick={day ? () => setDate(null) : onBack} aria-label="Back"><ChevronLeft size={22} aria-hidden="true" /></button>
      <strong>{day ? 'Day detail' : `${ctx.R}’s history`}</strong>
    </div>
    <div className="cg-sheet-body">
      {failed && !history ? <p className="cg-card-lead cg-pad" role="alert">Couldn’t load the history. Check the connection and try again.</p>
        : !history ? <div className="cg-loading" role="status"><div /><div /><p>Loading history…</p></div>
        : day ? <DayDetail key={day.date} day={day} history={history} ctx={ctx} now={now} onOpenIncident={onOpenIncident} />
        : <>
          <div role="radiogroup" aria-label="Range" className="cg-segmented cg-hist-range">
            {([7, 30] as const).map(value => <button key={value} type="button" role="radio" aria-checked={range === value} onClick={() => setRange(value)}>{value} days</button>)}
          </div>
          <section className="cg-card">
            <div className="cg-day-head"><h2>Daily activity</h2><span>Water, power &amp; door only</span></div>
            <div className="cg-axis cg-hist-axis" aria-hidden="true">{AXIS.map((label, index) => <span key={index}>{label}</span>)}</div>
            {range === 7 ? <ol className="cg-hist-rows">{days.map(item => row(item, false))}</ol>
              : weeks.map(week => <section key={week.label} aria-label={week.label}>
                <h3 className="cg-hist-week">{week.label}</h3>
                <ol className="cg-hist-rows">{week.days.map(item => row(item, true))}</ol>
              </section>)}
            <Legend />
          </section>
          <p className="cg-fineprint">Days marked Simulated are generated for this demo, not measured. Live days start at the last demo reset. Tap a day for hourly detail.</p>
        </>}
    </div>
  </div>
}
