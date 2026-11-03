// Mirrors backend/app/services/history.py for the mock layer. Its random draws differ from
// Python's, so the mock's simulated days are alike, not identical, to the backend's.
import type { AccessEvent, HistoryDay, Incident, MissingInterval, Reading, UnitHistory } from '../api/types'

type Steps = [number, number][] // (from ms, value) changes of a step function, in time order
type Window = [number, number]
type Missing = [number, number, MissingInterval['reason']]
interface Signals { water: Steps; power: Steps; powerInitial: number; doors: number[]; taps: [number, 'out' | 'in'][]; away: Window[]; missing: Missing[] }

const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000
// Fixed demo features by days before today, in local minutes, as in history.py.
const AWAY: Record<number, Window[]> = { 4: [[570, 1140]], 18: [[600, 1440]], 17: [[0, 1080]] }
const OFFLINE: Record<number, Window[]> = { 2: [[60, 240]], 23: [[780, 990]] }

const iso = (ms: number) => new Date(ms).toISOString()
const midnightOf = (date: string) => Date.parse(`${date}T00:00:00+08:00`) // Malaysia has no daylight saving
const localDate = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(ms))
const minutesOf = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
const overlaps = (a: Window, b: Window) => a[0] < b[1] && b[0] < a[1]

/** Seeded random numbers (FNV-1a hash into mulberry32), so a day looks the same on every call. */
function seeded(seed: string) {
  let h = 2166136261
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  const next = () => {
    h = h + 0x6d2b79f5 | 0
    let t = Math.imul(h ^ h >>> 15, 1 | h)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
  return { next, int: (a: number, b: number) => a + Math.floor(next() * (b - a + 1)) }
}

function steps(loads: [number, number, number][], base: number): Steps {
  const deltas = new Map<number, number>()
  for (const [start, end, amount] of loads) {
    deltas.set(start, (deltas.get(start) ?? 0) + amount)
    deltas.set(end, (deltas.get(end) ?? 0) - amount)
  }
  let value = base
  return [...deltas.keys()].sort((a, b) => a - b).map(at => [at, value = Math.round((value + deltas.get(at)!) * 1e6) / 1e6])
}

const valueAt = (series: Steps, initial: number, at: number) => series.reduce((value, [t, v]) => t <= at ? v : value, initial)

/** Integral of the step function over [a, b), in value-hours. */
function integral(series: Steps, initial: number, a: number, b: number): number {
  let total = 0, value = valueAt(series, initial, a), at = a
  for (const [t, v] of series) {
    if (t <= a) continue
    if (t >= b) break
    total += value * (t - at)
    value = v
    at = t
  }
  return (total + value * (b - at)) / HOUR
}

function subtract(window: Window, holes: Window[]): Window[] {
  let parts = [window]
  for (const [hs, he] of [...holes].sort((x, y) => x[0] - y[0]))
    parts = parts.flatMap(([a, b]) => [[a, Math.min(b, hs)], [Math.max(a, he), b]] as Window[]).filter(([a, b]) => a < b)
  return parts
}

function simulated(unitId: string, date: string, daysAgo: number, wake: string, outings: { start: string; end: string }[], standby: number): Signals {
  const r = seeded(`${unitId}:${date}`)
  const midnight = midnightOf(date)
  const at = (minute: number) => midnight + Math.max(0, Math.min(1440, minute)) * MIN
  const away = (AWAY[daysAgo] ?? []).map(([a, b]) => [at(a), at(b)] as Window)
  let outs: Window[] = []
  for (const outing of outings) {
    if (r.next() < 0.15) continue // stayed in this morning
    outs.push([at(minutesOf(outing.start) + r.int(-15, 20)), at(minutesOf(outing.end) + r.int(-10, 30))])
  }
  if (r.next() < 0.3) { const start = 15 * 60 + r.int(0, 60); outs.push([at(start), at(start + r.int(60, 120))]) }
  outs = outs.filter(o => !away.some(w => overlaps(o, w)))
  const notHome = [...outs, ...away]

  const w = minutesOf(wake) + r.int(-20, 25)
  const water: [number, number, number][] = [[w, r.int(7, 9), 7], [w + 25 + r.int(-5, 5), 3, 5],
    [12 * 60 + r.int(-30, 30), 4, 5], [18 * 60 + 30 + r.int(-30, 30), 6, 5], [21 * 60 + r.int(-20, 40), 5, 6]]
  const flushes = r.int(4, 6)
  for (let i = 0; i < flushes; i++) water.push([r.int(w + 60, 22 * 60), 1, 6])
  const power: [number, number, number][] = [[w + 10, 4, 1.8], [11 * 60 + 30 + r.int(-20, 20), 40, 1.4],
    [18 * 60 + r.int(-20, 30), 45, 1.5], [19 * 60 + 15, r.int(150, 200), 0.25]]
  const loads = (items: [number, number, number][]) => items.map(([s, d, v]) => [at(s), at(s + d), v] as [number, number, number])
    .filter(([s, e]) => s < e && !notHome.some(win => overlaps([s, e], win)))

  return {
    water: steps(loads(water), 0), power: steps(loads(power), standby), powerInitial: standby,
    doors: [...outs.flat(), ...away.flat().filter(t => t > midnight && t < at(1440))].sort((a, b) => a - b),
    // A card home taps out as she leaves and in as she returns, for the same outings.
    taps: [...outs, ...away].flatMap(([a, b]) => [[a, 'out'], [b, 'in']] as [number, 'out' | 'in'][])
      .filter(([t]) => t > midnight && t < at(1440)).sort((a, b) => a[0] - b[0]),
    away, missing: (OFFLINE[daysAgo] ?? []).map(([a, b]) => [at(a), at(b), 'feed_offline']),
  }
}

function day(date: string, source: HistoryDay['source'], s: Signals, cover: Window, incidents: Incident[], lastWater: number | null = null): HistoryDay {
  const start = midnightOf(date)
  const end = start + DAY
  const valid = cover[0] < cover[1] ? subtract(cover, s.missing.map(([a, b]) => [a, b])) : []
  const inside = (t: number) => valid.some(([a, b]) => a <= t && t < b)
  let firstWater: number | null = null
  for (const [a, b] of valid) {
    if (valueAt(s.water, 0, a) > 0) { firstWater = a; break }
    const rise = s.water.find(([t, v]) => a < t && t < b && v > 0)
    if (rise) { firstWater = rise[0]; break }
  }
  // The unit's last water activity can be seeded without a reading; Home counts it, so do we.
  if (lastWater !== null && inside(lastWater) && (firstWater === null || lastWater < firstWater)) firstWater = lastWater
  return {
    date, starts_at: iso(start), ends_at: iso(end), source,
    hours: Array.from({ length: 24 }, (_, hour) => {
      const hs = start + hour * HOUR, he = hs + HOUR
      const parts = valid.filter(([a, b]) => a < he && hs < b).map(([a, b]) => [Math.max(a, hs), Math.min(b, he)] as Window)
      if (!parts.length) return { hour, water_litres: null, energy_kwh: null }
      const sum = (series: Steps, initial: number) => parts.reduce((total, [a, b]) => total + integral(series, initial, a, b), 0)
      return { hour, water_litres: Math.round(sum(s.water, 0) * 60 * 10) / 10, energy_kwh: Math.round(sum(s.power, s.powerInitial) * 1000) / 1000 }
    }),
    first_water_at: firstWater === null ? null : iso(firstWater),
    door_opened_at: s.doors.filter(inside).map(iso),
    card_taps: s.taps.filter(([t]) => inside(t)).map(([t, direction]) => ({ at: iso(t), direction })),
    away: s.away.filter(([a, b]) => a < end && start < b).map(([a, b]) => ({ starts_at: iso(Math.max(a, start)), ends_at: iso(Math.min(b, end)) })),
    missing: s.missing.filter(([a, b]) => a < end && start < b).map(([a, b, reason]) => ({ starts_at: iso(Math.max(a, start)), ends_at: iso(Math.min(b, end)), reason })),
    incidents: incidents.filter(i => Date.parse(i.opened_at) >= start && Date.parse(i.opened_at) < end)
      .sort((a, b) => a.opened_at.localeCompare(b.opened_at))
      .map(i => ({ incident_id: i.incident_id, state: i.state, opened_at: i.opened_at, closed_at: i.closed_at, outcome: i.outcome })),
  }
}

interface Input {
  unitId: string; days: number; now: number; resetAt: number; standby: number; lastWater: number | null
  rhythm: { wake: string; outings: { start: string; end: string }[] }
  readings: Reading[]; away: Window[]; incidents: Incident[]
  card: boolean; taps: AccessEvent[]
}

export function buildHistory({ unitId, days, now, resetAt, standby, lastWater, rhythm, readings, away, incidents, card, taps }: Input): UnitHistory {
  const series = (sensor: Reading['sensor']): Steps => readings.filter(r => r.sensor === sensor).map(r => [Date.parse(r.recorded_at), Number(r.value)])
  // Readings are sent on change; before the first one the home counts as idle.
  const live: Signals = {
    water: series('water'), power: series('electricity'), powerInitial: standby, away, missing: [],
    doors: readings.filter(r => r.sensor === 'door' && r.value === 'open').map(r => Date.parse(r.recorded_at)),
    taps: taps.map(tap => [Date.parse(tap.at), tap.direction]),
  }
  // Each home has one outing signal: a card home has no door sensor, a door home no card taps.
  const signal = (s: Signals): Signals => card ? { ...s, doors: [] } : { ...s, taps: [] }
  const today = midnightOf(localDate(now))
  const resetDay = localDate(resetAt)
  return {
    unit_id: unitId, standby_power_kw: standby,
    days: Array.from({ length: days }, (_, daysAgo) => {
      const start = today - daysAgo * DAY
      const date = localDate(start)
      if (date < resetDay) return day(date, 'simulated_history', signal(simulated(unitId, date, daysAgo, rhythm.wake, rhythm.outings, standby)), [start, start + DAY], [])
      const before: Missing[] = date === resetDay ? [[start, resetAt, 'before_demo']] : []
      return day(date, 'live', signal({ ...live, missing: before }), [Math.max(start, resetAt), Math.min(start + DAY, now)], incidents, lastWater)
    }),
  }
}
