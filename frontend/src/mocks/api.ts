import seed from '../../../shared/seed.json'
import { ApiError } from '../api/live'
import type {
  Api, BuddyMatch, CommunityActivity, CompanionMessage, Config, Incident,
  MessagePreset, NeighbourMatch, NeighbourState, Notification, Reading, RealtimeEvent, Role, Snapshot, Unit,
} from '../api/types'

type SeedActivity = (typeof seed.community_activities)[number]
const config: Config = { grace_period_seconds: 15, reminder_interval_seconds: 15 }
const listeners = new Set<(event: RealtimeEvent) => void>()
const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const clone = <T,>(value: T): T => structuredClone(value)
const now = () => new Date().toISOString()
const localDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date())
const activityMessage = (sensor: Reading['sensor']) => ({
  door: 'Front door opened at home.',
  water: 'Water used at home.',
  electricity: 'Electricity used at home.',
})[sensor]

function activityDate(activity: SeedActivity, from = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long',
  }).formatToParts(from)
  const get = (type: string) => parts.find(part => part.type === type)?.value || ''
  const localDate = `${get('year')}-${get('month')}-${get('day')}`
  const currentWeekday = weekdays.indexOf(get('weekday').toLowerCase())
  const targetWeekday = activity.schedule.repeat === 'daily' ? currentWeekday : weekdays.indexOf(activity.schedule.weekday!)
  let days = (targetWeekday - currentWeekday + 7) % 7
  let candidate = new Date(`${localDate}T${activity.schedule.time}:00+08:00`)
  candidate.setUTCDate(candidate.getUTCDate() + days)
  if (candidate <= from) {
    days = activity.schedule.repeat === 'daily' ? 1 : 7
    candidate.setUTCDate(candidate.getUTCDate() + days)
  }
  return candidate.toISOString()
}

function activities(): CommunityActivity[] {
  return seed.community_activities.map(activity => ({
    activity_id: activity.activity_id,
    title: activity.title,
    starts_at: activityDate(activity),
    location: activity.location,
    near_unit_id: activity.near_unit_id,
  })).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

// Same-hour neighbours: mirrors backend app/services/neighbours.py (keep the two in step).
// Thresholds mirror NEIGHBOUR_MIN_OVERLAP_MINUTES and NEIGHBOUR_EARLY_RISER_BEFORE.
const NEIGHBOUR_MIN_OVERLAP = 30
const EARLY_RISER_BEFORE = '06:30'
type Window = [string, string]
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const localHHMM = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
const rhythmOf = (unitId: string) => seed.units.find(item => item.unit_id === unitId)!.rhythm

function overlap(a: string, b: string): [number, Window | null] {
  let total = 0, longest: Window | null = null, longestLength = 0
  for (const x of rhythmOf(a).outings) for (const y of rhythmOf(b).outings) {
    const start = x.start > y.start ? x.start : y.start
    const end = x.end < y.end ? x.end : y.end
    const length = minutes(end) - minutes(start)
    if (length <= 0) continue
    total += length
    if (length > longestLength || (length === longestLength && longest && start < longest[0])) { longest = [start, end]; longestLength = length }
  }
  return [total, longest]
}

function findNeighbour(unitId: string): { unitId: string; match: NeighbourMatch } | null {
  if (!neighbourConsents.has(unitId)) return null
  const wake = minutes(rhythmOf(unitId).wake)
  const best = seed.units
    .filter(item => item.unit_id !== unitId && neighbourConsents.has(item.unit_id))
    .map(item => { const [total, window] = overlap(unitId, item.unit_id); return { item, total, window, wakeDiff: Math.abs(minutes(item.rhythm.wake) - wake) } })
    .filter(c => c.window && c.total >= NEIGHBOUR_MIN_OVERLAP)
    .sort((a, b) => b.total - a.total || a.wakeDiff - b.wakeDiff || a.item.unit_id.localeCompare(b.item.unit_id))[0]
  if (!best) return null
  const [start, end] = best.window!
  const labels = []
  if (rhythmOf(unitId).wake < EARLY_RISER_BEFORE && best.item.rhythm.wake < EARLY_RISER_BEFORE) labels.push('early risers')
  labels.push(`${start < '12:00' ? 'morning' : start < '17:00' ? 'afternoon' : 'evening'} outings`)
  const nowIso = now()
  const meeting = activities()
    .filter(item => { const at = localHHMM(item.starts_at); return start <= at && at <= end })
    .sort((a, b) => Number(a.starts_at < nowIso) - Number(b.starts_at < nowIso) || a.starts_at.localeCompare(b.starts_at))[0] || null
  return {
    unitId: best.item.unit_id,
    match: { name: best.item.resident_name, floor: Number(best.item.unit_id.split('-').pop()!.slice(0, -2) || 0), labels, meeting_activity: meeting, simulated: true },
  }
}

function neighbourState(unitId: string): NeighbourState {
  unitOrThrow(unitId)
  const optedIn = neighbourConsents.has(unitId)
  return {
    unit_id: unitId, opted_in: optedIn, match: optedIn ? findNeighbour(unitId)?.match || null : null,
    introduction_requested_at: introductions.find(item => item.unit_id === unitId)?.requested_at || null,
  }
}

const initialConsents = () => new Set(seed.units.filter(item => item.open_to_neighbours).map(item => item.unit_id))

function initialSnapshot(): Snapshot {
  const resetAt = new Date()
  return {
    units: seed.units.map(item => ({
      unit_id: item.unit_id,
      resident_name: item.resident_name,
      caregiver_name: item.caregiver_name,
      caregiver_relationship: item.caregiver_relationship,
      controllable: item.controllable,
      status: item.status as Unit['status'],
      status_reason: item.status_reason.replace('{door_time}', new Date(resetAt.getTime() + (item.last_door_event_offset_seconds || 0) * 1000).toLocaleTimeString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' })),
      status_since: resetAt.toISOString(),
      latest: {
        water_lpm: item.latest.water_lpm,
        power_kw: item.latest.power_kw,
        door: item.latest.door as Unit['latest']['door'],
        last_door_event_at: item.last_door_event_offset_seconds === null ? null : new Date(resetAt.getTime() + item.last_door_event_offset_seconds * 1000).toISOString(),
      },
      quiet_gap: {
        last_water_activity_at: new Date(resetAt.getTime() + item.last_water_activity_offset_seconds * 1000).toISOString(),
        usual_max_seconds: item.baseline.usual_quiet_gap_seconds,
      },
      baseline: { ...item.baseline, source: 'simulated_history' as const },
      active_incident_id: null,
    })),
    incidents: [],
    notifications: [],
    config: clone(config),
  }
}

let state = initialSnapshot()
let readings: Reading[] = []
let messages: CompanionMessage[] = []
let matches: BuddyMatch[] = []
let responses: { activity_id: string; action: string }[] = []
let neighbourConsents = initialConsents()
let introductions: { unit_id: string; neighbour_unit_id: string; requested_at: string }[] = []
let morningSentOn: string | null = null
let scenarioTimers = new Set<ReturnType<typeof setTimeout>>()

export const mockSnapshot = (): Snapshot => clone(state)

// Presenter-only time jump: simulate the quiet-gap detector after a visible quiet period.
// It never runs in live mode; real status decisions belong to the backend.
export function primeMockInactivity(): Incident {
  const unit = unitOrThrow('A-105')
  if (latestIncident(unit.unit_id)) throw new ApiError(409, 'An incident is already active. Reset Demo before the inactivity scenario.')
  if (unit.status === 'possible_away' || unit.latest.door !== 'closed')
    throw new ApiError(409, 'The door or away status still suggests an outing. Return home or reset the demo before the inactivity scenario.')
  if (unit.latest.water_lpm > 0 || unit.latest.power_kw > unit.baseline.standby_power_kw)
    throw new ApiError(409, 'Household utility use is active. Reset Demo before the inactivity scenario.')
  morningSentOn = localDay()
  unit.quiet_gap.last_water_activity_at = new Date(Date.now() - unit.baseline.usual_quiet_gap_seconds * 1000).toISOString()
  publish('unit.updated', clone(unit))
  return startGrace(unit)
}

function later(action: () => void, milliseconds: number): void {
  const timer = setTimeout(() => { scenarioTimers.delete(timer); action() }, milliseconds)
  scenarioTimers.add(timer)
}

function clearScenarioTimers(): void {
  for (const timer of scenarioTimers) clearTimeout(timer)
  scenarioTimers = new Set()
}

function emit(event: RealtimeEvent): void {
  for (const listener of listeners) listener(clone(event))
}

function publish<T extends RealtimeEvent['type']>(type: T, data: Extract<RealtimeEvent, { type: T }>['data']): void {
  emit({ type, at: now(), data } as RealtimeEvent)
}

function unitOrThrow(id: string): Unit {
  const unit = state.units.find(value => value.unit_id === id)
  if (!unit) throw new ApiError(404, 'Unit not found')
  return unit
}

function incidentOrThrow(id: string): Incident {
  const incident = state.incidents.find(value => value.incident_id === id)
  if (!incident) throw new ApiError(404, 'Incident not found')
  return incident
}

function notify(notification: Omit<Notification, 'notification_id' | 'created_at' | 'read'>): void {
  const entry: Notification = { ...notification, notification_id: crypto.randomUUID(), created_at: now(), read: false }
  state.notifications.unshift(entry)
  publish('notification.created', clone(entry))
}

function updateUnit(unit: Unit, status: Unit['status'], reason: string): void {
  unit.status = status
  unit.status_reason = reason
  unit.status_since = now()
  publish('unit.updated', clone(unit))
}

function latestIncident(unitId: string): Incident | undefined {
  return state.incidents.find(item => item.unit_id === unitId && ['grace', 'notified', 'acknowledged'].includes(item.state))
}

function autoResolve(unit: Unit, incident: Incident): void {
  const alreadyNotified = incident.state !== 'grace'
  clearScenarioTimers()
  if (incident.state === 'grace') incident.events.push({ type: 'voice_call_cancelled', at: now(), detail: 'simulated' })
  incident.state = 'auto_resolved'
  incident.outcome = 'resident_activity_detected'
  incident.closed_at = now()
  incident.grace_ends_at = null
  incident.next_reminder_at = null
  incident.events.push({ type: 'auto_resolved', at: incident.closed_at, detail: 'Resident activity detected' })
  unit.active_incident_id = null
  updateUnit(unit, 'routine', 'Resolved: resident activity detected during the check')
  publish('incident.updated', clone(incident))
  if (alreadyNotified) for (const role of ['caregiver', 'township'] as Role[]) {
    notify({ role, unit_id: unit.unit_id, kind: 'auto_resolved', message: `${unit.resident_name} activity detected. Concern resolved.`, incident_id: incident.incident_id })
  }
}

function sendReminder(incident: Incident): void {
  if (incident.state !== 'notified') return
  incident.reminder_count += 1
  incident.events.push({ type: 'reminder', at: now(), detail: `Reminder #${incident.reminder_count}` })
  incident.next_reminder_at = new Date(Date.now() + state.config.reminder_interval_seconds * 1000).toISOString()
  publish('incident.updated', clone(incident))
  for (const role of ['caregiver', 'township'] as Role[]) {
    notify({ role, unit_id: incident.unit_id, kind: 'reminder', message: `Reminder #${incident.reminder_count}: concern at ${incident.unit_id} still needs a response.`, incident_id: incident.incident_id })
  }
  later(() => sendReminder(incident), state.config.reminder_interval_seconds * 1000)
}

function notifyConcern(unit: Unit, incident: Incident): void {
  if (incident.state !== 'grace' || !incident.events.some(event => event.type === 'voice_call_no_answer')) return
  incident.state = 'notified'
  incident.grace_ends_at = null
  incident.next_reminder_at = new Date(Date.now() + state.config.reminder_interval_seconds * 1000).toISOString()
  incident.events.push({ type: 'notified', at: now(), detail: 'Caregiver and township notified together' })
  updateUnit(unit, 'unresolved_concern', `No water use beyond the usual ${unit.baseline.usual_quiet_gap_seconds}-second gap; no door outing and electricity at standby. Mum did not answer the simulated call.`)
  publish('incident.updated', clone(incident))
  for (const role of ['caregiver', 'township'] as Role[]) {
    notify({ role, unit_id: unit.unit_id, kind: 'alert', message: `Unresolved concern at ${unit.unit_id}: ${unit.resident_name} could not be reached.`, incident_id: incident.incident_id })
  }
  later(() => sendReminder(incident), state.config.reminder_interval_seconds * 1000)
}

function startGrace(unit: Unit): Incident {
  const openedAt = now()
  const incident: Incident = {
    incident_id: crypto.randomUUID(), unit_id: unit.unit_id, state: 'grace', opened_at: openedAt,
    grace_ends_at: new Date(Date.now() + state.config.grace_period_seconds * 1000).toISOString(),
    next_reminder_at: null, reminder_count: 0, acknowledged_by: null, outcome: null, closed_at: null,
    events: [
      { type: 'detected', at: openedAt, detail: 'Water quiet gap exceeded' },
      { type: 'voice_call_started', at: openedAt, detail: 'Calling Mum (simulated)' },
    ],
  }
  state.incidents.unshift(incident)
  unit.active_incident_id = incident.incident_id
  updateUnit(unit, 'unusual_inactivity', `No water use longer than the usual ${unit.baseline.usual_quiet_gap_seconds}-second gap. No door outing; electricity remains at standby.`)
  publish('incident.updated', clone(incident))
  later(() => {
    if (incident.state !== 'grace') return
    incident.events.push({ type: 'voice_call_no_answer', at: now(), detail: 'No answer (simulated)' })
    publish('incident.updated', clone(incident))
  }, Math.min(2000, state.config.grace_period_seconds * 500))
  later(() => notifyConcern(unit, incident), state.config.grace_period_seconds * 1000)
  return incident
}

export const mockApi: Api = {
  async getConfig() { return clone(state.config) },
  async getUnits() { return clone(state.units) },
  async getUnit(id) { return clone(unitOrThrow(id)) },
  async getReadings(id, since) {
    unitOrThrow(id)
    return clone(readings.filter(reading => reading.unit_id === id && (!since || reading.recorded_at >= since)))
  },
  async getUnitIncidents(id, incidentState) {
    unitOrThrow(id)
    return clone(state.incidents.filter(incident => incident.unit_id === id && (!incidentState || incident.state === incidentState)).reverse())
  },
  async getIncident(id) { return clone(incidentOrThrow(id)) },
  async getNotifications(role) { return clone(state.notifications.filter(item => item.role === role)) },
  async getActivities(unitId) {
    if (unitId) unitOrThrow(unitId)
    return clone(activities().filter(item => !unitId || item.near_unit_id === unitId))
  },
  async getMessages(unitId) { unitOrThrow(unitId); return clone(messages.filter(item => item.unit_id === unitId)) },
  async getMessagePresets() { return clone(seed.message_presets as MessagePreset[]) },
  async getBuddy(unitId) { unitOrThrow(unitId); return clone(matches.find(item => item.unit_id === unitId) || null) },
  async getNeighbours(unitId) { return neighbourState(unitId) },
  async postReading(input) {
    const unit = unitOrThrow(input.unit_id)
    if (!unit.controllable) throw new ApiError(403, 'Only the controllable unit accepts readings')
    const reading: Reading = { ...input, recorded_at: input.recorded_at || now() }
    if (reading.sensor === 'door') {
      if (reading.value !== 'open' && reading.value !== 'closed') throw new ApiError(422, 'Invalid door value')
      unit.latest.door = reading.value
      unit.latest.last_door_event_at = reading.recorded_at
    } else if (typeof reading.value === 'number' && reading.value >= 0) {
      if (reading.sensor === 'water') {
        unit.latest.water_lpm = reading.value
        if (reading.value > 0) unit.quiet_gap.last_water_activity_at = reading.recorded_at
      } else unit.latest.power_kw = reading.value
    } else throw new ApiError(422, 'Invalid sensor value')
    readings.push(reading)
    publish('reading.received', clone(reading))
    const activity = reading.sensor === 'door' ? reading.value === 'open' : typeof reading.value === 'number' && reading.value > (reading.sensor === 'electricity' ? unit.baseline.standby_power_kw : 0)
    const incident = latestIncident(unit.unit_id)
    if (activity && incident && !incident.events.some(event => event.type === 'emergency_called' || event.type === 'unable_to_verify')) autoResolve(unit, incident)
    else if (incident?.events.some(event => event.type === 'emergency_called' || event.type === 'unable_to_verify')) publish('unit.updated', clone(unit))
    else if (activity && reading.sensor !== 'door' && ['routine', 'possible_away'].includes(unit.status)) {
      updateUnit(unit, 'routine', reading.sensor === 'electricity' ? 'Water and electricity activity within usual routine' : 'Water activity detected within usual routine')
    } else publish('unit.updated', clone(unit))
    if (morningSentOn !== localDay() && activity && !incident) {
      morningSentOn = localDay()
      notify({ role: 'caregiver', unit_id: unit.unit_id, kind: 'morning_reassurance', message: `${unit.caregiver_relationship}'s day has started. ${activityMessage(reading.sensor)}`, incident_id: null })
    }
    return { accepted: true, unit: clone(unit) }
  },
  async acknowledgeIncident(id, actor) {
    const incident = incidentOrThrow(id)
    if (!['grace', 'notified'].includes(incident.state)) throw new ApiError(409, 'Incident already acknowledged or closed')
    clearScenarioTimers()
    incident.state = 'acknowledged'
    incident.acknowledged_by = { ...actor, at: now() }
    incident.grace_ends_at = null
    incident.next_reminder_at = null
    incident.events.push({ type: 'acknowledged', at: now(), actor })
    publish('incident.updated', clone(incident))
    for (const role of ['township', 'caregiver'] as Role[]) notify({ role, unit_id: incident.unit_id, kind: 'acknowledged', message: `${actor.name} is checking now.`, incident_id: id })
    return clone(incident)
  },
  async escalateIncident(id, actor) {
    const incident = incidentOrThrow(id)
    if (incident.state !== 'acknowledged') throw new ApiError(409, 'A responder must acknowledge this incident first')
    if (incident.acknowledged_by?.role !== actor.role || incident.acknowledged_by.name !== actor.name) throw new ApiError(403, 'Only the acknowledger can record this handoff')
    if (incident.events.some(event => event.type === actor.action)) throw new ApiError(409, 'This handoff has already been recorded')
    if (actor.action === 'unable_to_verify' && incident.events.some(event => event.type === 'emergency_called')) throw new ApiError(409, '999 has already been recorded as called')
    const detail = actor.action === 'unable_to_verify'
      ? 'Responder could not verify resident safety; urgent follow-up required.'
      : 'Responder reported calling 999; emergency services have not been confirmed dispatched.'
    incident.events.push({ type: actor.action, at: now(), actor: { role: actor.role, name: actor.name }, detail })
    publish('incident.updated', clone(incident))
    for (const role of ['township', 'caregiver'] as Role[]) notify({ role, unit_id: incident.unit_id, kind: actor.action,
      message: actor.action === 'unable_to_verify' ? `${actor.name} could not verify the resident's safety. Urgent follow-up is needed.` : `${actor.name} reports calling 999. Emergency response is pending confirmation.`, incident_id: id })
    return clone(incident)
  },
  async closeIncident(id, actor) {
    if (actor.role === 'township' && !actor.report?.trim()) throw new ApiError(422, 'Township response requires a short report')
    const incident = incidentOrThrow(id)
    if (incident.state !== 'acknowledged') throw new ApiError(409, 'Incident must be acknowledged first')
    if (incident.acknowledged_by?.role !== actor.role || incident.acknowledged_by.name !== actor.name) throw new ApiError(403, 'Only the acknowledger can close this incident')
    if (incident.events.some(event => event.type === 'unable_to_verify') && !incident.events.some(event => event.type === 'emergency_called') && actor.outcome !== 'resident_ok')
      throw new ApiError(409, 'Record the emergency handoff or confirm the resident is safe before closing')
    clearScenarioTimers()
    incident.state = 'closed'
    incident.outcome = actor.outcome
    incident.report = actor.report?.trim() || null
    incident.closed_at = now()
    incident.events.push({ type: 'closed', at: incident.closed_at, actor: { role: actor.role, name: actor.name } })
    const unit = unitOrThrow(incident.unit_id)
    unit.status = 'routine'
    unit.status_reason = 'Incident closed by responder'
    unit.status_since = now()
    unit.active_incident_id = null
    publish('incident.updated', clone(incident))
    publish('unit.updated', clone(unit))
    for (const role of ['township', 'caregiver'] as Role[]) notify({ role, unit_id: incident.unit_id, kind: 'closed', message: `Incident closed: ${actor.outcome.replaceAll('_', ' ')}.`, incident_id: id })
    return clone(incident)
  },
  async markNotificationsRead(role) {
    for (const item of state.notifications) if (item.role === role && !item.read) {
      item.read = true
      publish('notification.updated', clone(item))
    }
  },
  async markNotificationRead(id, role) {
    const item = state.notifications.find(item => item.notification_id === id && item.role === role)
    if (!item) throw new ApiError(404, 'Notification not found')
    item.read = true
    publish('notification.updated', clone(item))
    return clone(item)
  },
  async respondToActivity(id, action) {
    if (!activities().some(item => item.activity_id === id)) throw new ApiError(404, 'Activity not found')
    responses.push({ activity_id: id, action })
    return { ok: true }
  },
  async sendMessage(body) {
    unitOrThrow(body.unit_id)
    const preset = seed.message_presets.find(item => item.preset_id === body.preset_id)
    if (!preset) throw new ApiError(404, 'Preset not found')
    const message: CompanionMessage = {
      message_id: crypto.randomUUID(), unit_id: body.unit_id, from_name: body.from_name,
      preset_id: preset.preset_id, text: preset.text, channel: 'voice_call',
      simulated: true, status: 'delivered', sent_at: now(),
    }
    messages.unshift(message)
    publish('companion.message_delivered', clone(message))
    notify({ role: 'caregiver', unit_id: body.unit_id, kind: 'message_delivered', message: `Delivered to ${unitOrThrow(body.unit_id).caregiver_relationship} by voice call: "${preset.text}"`, incident_id: null })
    return clone(message)
  },
  async requestBuddy(unitId) {
    unitOrThrow(unitId)
    if (matches.some(item => item.unit_id === unitId)) throw new ApiError(409, 'Already matched')
    const interests = seed.units.find(item => item.unit_id === unitId)?.interests || []
    const buddy = [...seed.buddies].sort((a, b) => a.buddy_id.localeCompare(b.buddy_id)).find(item => item.interests.some(interest => interests.includes(interest)))
    if (!buddy) throw new ApiError(404, 'No shared interest')
    const sharedInterest = interests.find(interest => buddy.interests.includes(interest))!
    const match: BuddyMatch = {
      unit_id: unitId, buddy: clone(buddy), shared_interest: sharedInterest,
      next_activity: activities().find(item => item.near_unit_id === unitId) || null,
      simulated: true, matched_at: now(),
    }
    matches.push(match)
    notify({ role: 'caregiver', unit_id: unitId, kind: 'buddy_matched', message: `${unitOrThrow(unitId).caregiver_relationship} is matched with ${buddy.name}, who also enjoys ${sharedInterest}`, incident_id: null })
    return clone(match)
  },
  async setNeighbourConsent(unitId, open) {
    unitOrThrow(unitId)
    if (open) neighbourConsents.add(unitId)
    else {
      neighbourConsents.delete(unitId)
      introductions = introductions.filter(item => item.unit_id !== unitId && item.neighbour_unit_id !== unitId)
    }
    return neighbourState(unitId)
  },
  async requestNeighbourIntroduction(unitId) {
    const unit = unitOrThrow(unitId)
    if (!neighbourConsents.has(unitId)) throw new ApiError(409, 'Resident has not agreed to be introduced')
    if (introductions.some(item => item.unit_id === unitId)) throw new ApiError(409, 'Introduction already requested')
    const found = findNeighbour(unitId)
    if (!found) throw new ApiError(404, 'No neighbour keeps the same hours')
    introductions.push({ unit_id: unitId, neighbour_unit_id: found.unitId, requested_at: now() })
    notify({ role: 'caregiver', unit_id: unitId, kind: 'neighbour_introduced', message: `Introduction requested. The community coordinator will arrange for ${unit.caregiver_relationship} to meet ${found.match.name}.`, incident_id: null })
    return neighbourState(unitId)
  },
  async resetDemo() {
    clearScenarioTimers()
    state = initialSnapshot()
    readings = []
    messages = []
    matches = []
    responses = []
    neighbourConsents = initialConsents()
    introductions = []
    morningSentOn = null
    publish('snapshot', clone(state))
    return { units: clone(state.units) }
  },
  // The mock has no background quiet-gap watch; scenarios prime its inactivity explicitly.
  async setMonitoring(active) {
    return { unit_id: 'A-105', active }
  },
  connect(onEvent, onStatus) {
    listeners.add(onEvent)
    queueMicrotask(() => { if (listeners.has(onEvent)) { onStatus?.(true); onEvent({ type: 'snapshot', at: now(), data: clone(state) }) } })
    return () => { listeners.delete(onEvent); onStatus?.(false) }
  },
}

export type MockScenario = 'normal_morning' | 'going_out' | 'unusual_inactivity' | 'false_alarm_recovery'

// Developer-only sequences. They emit the contract events without a backend; the 3D viewer
// will own scenario scripts in the integrated demo and send ordinary sensor readings instead.
export const mockScenarios = {
  async run(scenario: MockScenario): Promise<void> {
    await mockApi.resetDemo()
    const unit = unitOrThrow('A-105')
    if (scenario === 'normal_morning') {
      await mockApi.postReading({ unit_id: unit.unit_id, sensor: 'water', value: 6 })
      await mockApi.postReading({ unit_id: unit.unit_id, sensor: 'water', value: 0 })
      await mockApi.postReading({ unit_id: unit.unit_id, sensor: 'electricity', value: 1.8 })
      await mockApi.postReading({ unit_id: unit.unit_id, sensor: 'electricity', value: unit.baseline.standby_power_kw })
      return
    }
    morningSentOn = localDay() // These scenarios begin after the resident's day has started.
    if (scenario === 'going_out') {
      await mockApi.postReading({ unit_id: unit.unit_id, sensor: 'door', value: 'open' })
      await mockApi.postReading({ unit_id: unit.unit_id, sensor: 'door', value: 'closed' })
      updateUnit(unit, 'possible_away', 'Door opened, then no water use and electricity at standby: probably out')
      later(() => {
        void mockApi.postReading({ unit_id: unit.unit_id, sensor: 'door', value: 'open' }).then(() =>
          mockApi.postReading({ unit_id: unit.unit_id, sensor: 'door', value: 'closed' })).then(() =>
          updateUnit(unit, 'routine', 'Door opened again and the resident returned home'))
      }, 6000)
      return
    }
    // Begin near the resident's own threshold so the presenter can see the progress
    // bar finish without waiting the full quiet gap on stage.
    unit.quiet_gap.last_water_activity_at = new Date(Date.now() - (unit.baseline.usual_quiet_gap_seconds - 5) * 1000).toISOString()
    publish('unit.updated', clone(unit))
    later(() => {
      const incident = startGrace(unit)
      if (scenario === 'false_alarm_recovery') {
        later(() => {
          if (incident.state !== 'grace') return
          void mockApi.postReading({ unit_id: unit.unit_id, sensor: 'water', value: 6 }).then(() =>
            mockApi.postReading({ unit_id: unit.unit_id, sensor: 'water', value: 0 }))
        }, Math.min(5000, state.config.grace_period_seconds * 500))
      }
    }, 5000)
  },
}
