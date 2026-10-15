// Mirrors PRD section 8.1 and backend/app/models.py. Keep changes in sync.
export type UnitId = string
export type Role = 'township' | 'caregiver'
export type Sensor = 'water' | 'electricity' | 'door'
export type DoorState = 'open' | 'closed'
export type Status = 'routine' | 'possible_away' | 'unusual_inactivity' | 'unresolved_concern'
export type IncidentState = 'grace' | 'notified' | 'acknowledged' | 'closed' | 'auto_resolved'
export type Outcome = 'resident_ok' | 'assistance_provided' | 'resident_away' | 'resident_activity_detected'

export interface Reading {
  unit_id: UnitId
  sensor: Sensor
  value: number | DoorState
  recorded_at: string
}

export interface Baseline {
  usual_quiet_gap_seconds: number
  usual_outing_seconds: number
  standby_power_kw: number
  source: 'simulated_history'
}

export interface Unit {
  unit_id: UnitId
  resident_name: string
  caregiver_name: string
  caregiver_relationship: string
  controllable: boolean
  status: Status
  status_reason: string
  status_since: string
  latest: {
    water_lpm: number
    power_kw: number
    door: DoorState
    last_door_event_at: string | null
  }
  quiet_gap: {
    last_water_activity_at: string | null
    usual_max_seconds: number
  }
  baseline: Baseline
  active_incident_id: string | null
}

export type IncidentEventType =
  | 'detected' | 'voice_call_started' | 'voice_call_no_answer' | 'voice_call_cancelled'
  | 'notified' | 'reminder' | 'acknowledged' | 'closed' | 'auto_resolved'

export interface IncidentEvent {
  type: IncidentEventType
  at: string
  actor?: { role: Role; name: string }
  detail?: string
}

export interface Incident {
  incident_id: string
  unit_id: UnitId
  state: IncidentState
  opened_at: string
  grace_ends_at: string | null
  next_reminder_at: string | null
  reminder_count: number
  acknowledged_by: { role: Role; name: string; at: string } | null
  outcome: Outcome | null
  closed_at: string | null
  events: IncidentEvent[]
}

export type NotificationKind =
  | 'morning_reassurance' | 'alert' | 'reminder' | 'acknowledged' | 'closed'
  | 'auto_resolved' | 'message_delivered' | 'buddy_matched'

export interface Notification {
  notification_id: string
  role: Role
  unit_id: UnitId
  kind: NotificationKind
  message: string
  incident_id: string | null
  created_at: string
  read: boolean
}

export interface CommunityActivity {
  activity_id: string
  title: string
  starts_at: string
  location: string
  near_unit_id: UnitId
}

export interface MessagePreset { preset_id: string; text: string }

export interface CompanionMessage {
  message_id: string
  unit_id: UnitId
  from_name: string
  preset_id: string
  text: string
  channel: 'voice_call'
  simulated: true
  status: 'delivered'
  sent_at: string
}

export interface Buddy { buddy_id: string; name: string; interests: string[] }

export interface BuddyMatch {
  unit_id: UnitId
  buddy: Buddy
  shared_interest: string
  next_activity: CommunityActivity | null
  simulated: true
  matched_at: string
}

export interface Config {
  grace_period_seconds: number
  reminder_interval_seconds: number
}

export interface Snapshot {
  units: Unit[]
  incidents: Incident[]
  notifications: Notification[]
  config: Config
}

export type RealtimeEvent =
  | { type: 'snapshot'; at: string; data: Snapshot }
  | { type: 'reading.received'; at: string; data: Reading }
  | { type: 'unit.updated'; at: string; data: Unit }
  | { type: 'incident.updated'; at: string; data: Incident }
  | { type: 'notification.created'; at: string; data: Notification }
  | { type: 'companion.message_delivered'; at: string; data: CompanionMessage }

export interface Api {
  getConfig(): Promise<Config>
  getUnits(): Promise<Unit[]>
  getUnit(id: UnitId): Promise<Unit>
  getReadings(id: UnitId, since?: string): Promise<Reading[]>
  getUnitIncidents(id: UnitId, state?: IncidentState): Promise<Incident[]>
  getIncident(id: string): Promise<Incident>
  getNotifications(role: Role): Promise<Notification[]>
  getActivities(unitId?: UnitId): Promise<CommunityActivity[]>
  getMessages(unitId: UnitId): Promise<CompanionMessage[]>
  getMessagePresets(): Promise<MessagePreset[]>
  getBuddy(unitId: UnitId): Promise<BuddyMatch | null>
  postReading(reading: Omit<Reading, 'recorded_at'> & { recorded_at?: string }): Promise<{ accepted: true; unit: Unit }>
  acknowledgeIncident(id: string, actor: { role: Role; name: string }): Promise<Incident>
  closeIncident(id: string, actor: { role: Role; name: string; outcome: Exclude<Outcome, 'resident_activity_detected'> }): Promise<Incident>
  markNotificationsRead(role: Role): Promise<void>
  respondToActivity(id: string, action: 'invite_resident' | 'join_together'): Promise<{ ok: true }>
  sendMessage(body: { unit_id: UnitId; from_name: string; preset_id: string }): Promise<CompanionMessage>
  requestBuddy(unitId: UnitId): Promise<BuddyMatch>
  resetDemo(): Promise<{ units: Unit[] }>
  connect(onEvent: (event: RealtimeEvent) => void, onStatus?: (connected: boolean) => void): () => void
}
