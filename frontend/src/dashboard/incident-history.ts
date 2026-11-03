import type { Incident } from '../api/types'

export type HistoryPeriod = 7 | 30 | 'all'
const DAY = 86_400_000
const MALAYSIA_OFFSET = 8 * 60 * 60 * 1000

export function completedAt(incident: Incident): string | null {
  return incident.closed_at ?? [...incident.events].reverse().find(event => event.type === 'closed' || event.type === 'auto_resolved')?.at ?? null
}

export function periodStart(period: HistoryPeriod, now: number): number {
  if (period === 'all') return -Infinity
  // Malaysia has no daylight-saving changes; shift to local midnight before counting days.
  return Math.floor((now + MALAYSIA_OFFSET) / DAY) * DAY - MALAYSIA_OFFSET - (period - 1) * DAY
}

export function finishedIncidents(incidents: Incident[], period: HistoryPeriod, now: number): Incident[] {
  const start = periodStart(period, now)
  return incidents.filter(incident => {
    if (incident.state !== 'closed' && incident.state !== 'auto_resolved') return false
    const date = completedAt(incident)
    const time = date ? Date.parse(date) : NaN
    return period === 'all' ? !Number.isFinite(time) || time <= now : time >= start && time <= now
  }).sort((a, b) => (Date.parse(completedAt(b) ?? '') || 0) - (Date.parse(completedAt(a) ?? '') || 0)
    || a.incident_id.localeCompare(b.incident_id))
}

export const townshipRequestedCount = (incidents: Incident[]) => incidents.filter(incident => incident.events.some(event => event.type === 'notified')).length

export const originalTrigger = (incident: Incident) => incident.trigger_reason?.trim()
  || incident.events.find(event => event.type === 'detected')?.detail?.trim() || 'Not recorded'
