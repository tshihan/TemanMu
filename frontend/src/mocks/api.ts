import seed from '../../../shared/seed.json'
import { ApiError } from '../api/live'
import type {
  Api, BuddyMatch, CommunityActivity, CompanionMessage, Config, Incident,
  MessagePreset, Notification, Reading, RealtimeEvent, Role, Snapshot, Unit,
} from '../api/types'

type SeedActivity = (typeof seed.community_activities)[number]
const config: Config = { grace_period_seconds: 15, reminder_interval_seconds: 15 }
const listeners = new Set<(event: RealtimeEvent) => void>()
const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const clone = <T,>(value: T): T => structuredClone(value)
const now = () => new Date().toISOString()

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
let morningSent = false

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
    publish('unit.updated', clone(unit))
    if (!morningSent && (reading.sensor === 'door' || (typeof reading.value === 'number' && reading.value > (reading.sensor === 'electricity' ? unit.baseline.standby_power_kw : 0)))) {
      morningSent = true
      notify({ role: 'caregiver', unit_id: unit.unit_id, kind: 'morning_reassurance', message: `${unit.caregiver_relationship}'s day has started. Activity detected at home.`, incident_id: null })
    }
    return { accepted: true, unit: clone(unit) }
  },
  async acknowledgeIncident(id, actor) {
    const incident = incidentOrThrow(id)
    if (!['grace', 'notified'].includes(incident.state)) throw new ApiError(409, 'Incident already acknowledged or closed')
    incident.state = 'acknowledged'
    incident.acknowledged_by = { ...actor, at: now() }
    incident.next_reminder_at = null
    incident.events.push({ type: 'acknowledged', at: now(), actor })
    publish('incident.updated', clone(incident))
    for (const role of ['township', 'caregiver'] as Role[]) notify({ role, unit_id: incident.unit_id, kind: 'acknowledged', message: `${actor.name} is checking now.`, incident_id: id })
    return clone(incident)
  },
  async closeIncident(id, actor) {
    const incident = incidentOrThrow(id)
    if (incident.state !== 'acknowledged') throw new ApiError(409, 'Incident must be acknowledged first')
    if (incident.acknowledged_by?.role !== actor.role || incident.acknowledged_by.name !== actor.name) throw new ApiError(403, 'Only the acknowledger can close this incident')
    incident.state = 'closed'
    incident.outcome = actor.outcome
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
    for (const item of state.notifications) if (item.role === role) item.read = true
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
    notify({ role: 'caregiver', unit_id: body.unit_id, kind: 'message_delivered', message: `Delivered to ${unitOrThrow(body.unit_id).caregiver_relationship} by voice call (simulated).`, incident_id: null })
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
    notify({ role: 'caregiver', unit_id: unitId, kind: 'buddy_matched', message: `Matched with ${buddy.name} through ${sharedInterest}.`, incident_id: null })
    return clone(match)
  },
  async resetDemo() {
    state = initialSnapshot()
    readings = []
    messages = []
    matches = []
    responses = []
    morningSent = false
    publish('snapshot', clone(state))
    return { units: clone(state.units) }
  },
  connect(onEvent, onStatus) {
    listeners.add(onEvent)
    queueMicrotask(() => { if (listeners.has(onEvent)) { onStatus?.(true); onEvent({ type: 'snapshot', at: now(), data: clone(state) }) } })
    return () => { listeners.delete(onEvent); onStatus?.(false) }
  },
}
