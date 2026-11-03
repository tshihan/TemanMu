import type { Incident } from '../api/types'

export function latestHospitalTransfer(incidents: Incident[]): Incident | null {
  return incidents.filter(incident => incident.state === 'closed' && incident.outcome === 'sent_to_hospital')
    .sort((a, b) => (a.closed_at ?? a.opened_at).localeCompare(b.closed_at ?? b.opened_at)).at(-1) ?? null
}

export function hospitalGuard(incident: Incident | null): string | null {
  const actor = incident?.events.findLast(event => event.type === 'closed')?.actor
  if (actor?.role === 'township' && actor.name.trim()) return actor.name
  const accepted = incident?.acknowledged_by
  return accepted?.role === 'township' && accepted.name.trim() ? accepted.name : null
}

export function hospitalNote(incident: Incident | null): string | null {
  const note = incident?.report?.trim()
  return note && note !== 'Sent to hospital' ? note : null
}
