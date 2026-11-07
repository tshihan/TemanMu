// Mirrors PRD section 8.1 and backend/app/models.py. Keep changes in sync.
export type UnitId = string
export type Role = 'township' | 'caregiver'
export type Sensor = 'water' | 'electricity' | 'door'
export type DoorState = 'open' | 'closed'
export type OutingSignal = 'card' | 'door'
export type AccessDirection = 'out' | 'in'
/** A resident's access-card tap at the lift lobby or gate (card homes only). */
export interface AccessEvent { unit_id: UnitId; card_holder: string; direction: AccessDirection; access_point: string; at: string }
export type Status = 'routine' | 'possible_away' | 'unusual_inactivity' | 'unresolved_concern'
export type IncidentState = 'grace' | 'notified' | 'acknowledged' | 'closed' | 'auto_resolved'
export type Outcome = 'resident_ok' | 'assistance_provided' | 'sent_to_hospital' | 'resident_away' | 'resident_activity_detected'
  // Home check during an away period: what the guard found at the home.
  | 'home_secure' | 'known_person_home' | 'resident_returned' | 'security_concern'
/** The caregiver's answer to activity at home during an away period. */
export type AwayActivityResponse = 'resident_returned' | 'known_visitor' | 'home_check_requested'

export interface Reading {
  unit_id: UnitId
  sensor: Sensor
  value: number | DoorState
  recorded_at: string
}

/** Where a learned quiet gap came from, in real-life ("story") time. */
export interface LearnedQuietGap {
  story_minutes: number
  scene_time: string
  story_minutes_per_demo_second: number
  model: string
  trained_days: number
  source: 'simulated_history'
}

export interface Baseline {
  usual_quiet_gap_seconds: number
  usual_outing_seconds: number
  standby_power_kw: number
  source: 'simulated_history'
  /** Set when the quiet gap comes from the Quiet Gap Model instead of a typed-in number. */
  learned_quiet_gap?: LearnedQuietGap | null
}

/** A caregiver-declared time when the resident is not at home. Every screen (township
 *  included) receives these on Unit, so there is no reason here. */
export interface AwayPeriod {
  period_id: string
  starts_at: string
  ends_at: string
  created_at: string
}

/** Caregiver-only: the period with its optional private reason. */
export interface AwayPeriodDetail extends AwayPeriod { reason: string | null }

export interface Unit {
  unit_id: UnitId
  resident_name: string
  caregiver_name: string
  caregiver_relationship: string
  controllable: boolean
  outing_signal: OutingSignal
  care_state: 'home_monitoring' | 'in_hospital'
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
    last_caregiver_confirmation_at: string | null
    usual_max_seconds: number
  }
  baseline: Baseline
  active_incident_id: string | null
  /** Current and upcoming away periods, earliest first. */
  away_periods: AwayPeriod[]
  /** Card homes: the latest tap. Township screens show it only while a concern is open. */
  last_access: { direction: AccessDirection; access_point: string; at: string } | null
  /** Card homes: set after a tap in until water or electricity is used at home. */
  awaiting_arrival_since: string | null
}

export type IncidentEventType =
  | 'detected' | 'voice_call_started' | 'voice_call_no_answer' | 'voice_call_cancelled'
  | 'notified' | 'reminder' | 'acknowledged' | 'caregiver_checking_in' | 'township_requested' | 'unable_to_verify' | 'emergency_called' | 'closed' | 'auto_resolved'

export interface IncidentEvent {
  type: IncidentEventType
  at: string
  actor?: { role: Role; name: string }
  detail?: string
}

export interface Incident {
  trigger_reason: string | null
  incident_id: string
  unit_id: UnitId
  state: IncidentState
  opened_at: string
  grace_ends_at: string | null
  next_reminder_at: string | null
  reminder_count: number
  acknowledged_by: { role: Role; name: string; at: string } | null
  outcome: Outcome | null
  report?: string | null
  hospital_name?: string | null
  hospital_sent_at?: string | null
  closed_at: string | null
  events: IncidentEvent[]
}

export type NotificationKind =
  | 'morning_reassurance' | 'alert' | 'reminder' | 'acknowledged' | 'closed'
  | 'caregiver_checking_in' | 'township_requested' | 'unable_to_verify' | 'emergency_called' | 'auto_resolved' | 'message_delivered' | 'buddy_matched'
  | 'neighbour_introduced' | 'away_activity'

export interface Notification {
  notification_id: string
  role: Role
  unit_id: UnitId
  kind: NotificationKind
  message: string
  incident_id: string | null
  created_at: string
  read: boolean
  // away_activity only: the caregiver's answer, once given.
  response?: AwayActivityResponse | null
  responded_at?: string | null
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

/** A same-hour neighbour. Carries no times and no unit_id on purpose (privacy). */
export interface NeighbourMatch {
  name: string
  floor: number
  labels: string[]
  meeting_activity: CommunityActivity | null
  simulated: true
}

export interface NeighbourState {
  unit_id: UnitId
  opted_in: boolean
  match: NeighbourMatch | null
  introduction_requested_at: string | null
}

export interface Config {
  grace_period_seconds: number
  reminder_interval_seconds: number
}

/** Caregiver activity history (phase2.md §5). Mirrors backend/app/models.py. */
export interface HistoryInterval { starts_at: string; ends_at: string }
export interface MissingInterval extends HistoryInterval { reason: 'feed_offline' | 'before_demo' }
/** Use within one local hour; null where the whole hour has no data or is still to come. */
export interface HistoryHour { hour: number; water_litres: number | null; energy_kwh: number | null }
export interface HistoryIncident { incident_id: string; state: IncidentState; opened_at: string; closed_at: string | null; outcome: Outcome | null }
export interface HistoryDay {
  date: string
  starts_at: string
  ends_at: string
  /** simulated_history days are generated for the demo, never measured. */
  source: 'simulated_history' | 'live'
  hours: HistoryHour[]
  first_water_at: string | null
  /** Door homes only. */
  door_opened_at: string[]
  /** Card homes only: lift-lobby or gate taps. */
  card_taps: { at: string; direction: AccessDirection }[]
  away: HistoryInterval[]
  missing: MissingInterval[]
  incidents: HistoryIncident[]
}
export type HistoryRange = 7 | 30
/** Newest day first, today included. */
export interface UnitHistory { unit_id: UnitId; standby_power_kw: number; days: HistoryDay[] }

export interface Snapshot {
  units: Unit[]
  incidents: Incident[]
  notifications: Notification[]
  config: Config
}

export type RealtimeEvent =
  | { type: 'snapshot'; at: string; data: Snapshot }
  | { type: 'reading.received'; at: string; data: Reading }
  | { type: 'access.received'; at: string; data: AccessEvent }
  | { type: 'unit.updated'; at: string; data: Unit }
  | { type: 'incident.updated'; at: string; data: Incident }
  | { type: 'notification.created'; at: string; data: Notification }
  | { type: 'notification.updated'; at: string; data: Notification }
  | { type: 'companion.message_delivered'; at: string; data: CompanionMessage }

/** Per-scenario simulated call pacing sent with POST /api/demo/monitoring. */
export type CallTiming = { grace_period_seconds: number; voice_call_ring_seconds: number }

export interface Api {
  getConfig(): Promise<Config>
  getUnits(): Promise<Unit[]>
  getUnit(id: UnitId): Promise<Unit>
  getReadings(id: UnitId, since?: string): Promise<Reading[]>
  getUnitIncidents(id: UnitId, state?: IncidentState): Promise<Incident[]>
  getHistory(id: UnitId, days: HistoryRange): Promise<UnitHistory>
  getIncident(id: string): Promise<Incident>
  getNotifications(role: Role): Promise<Notification[]>
  getActivities(unitId?: UnitId): Promise<CommunityActivity[]>
  getMessages(unitId: UnitId): Promise<CompanionMessage[]>
  getMessagePresets(): Promise<MessagePreset[]>
  getBuddy(unitId: UnitId): Promise<BuddyMatch | null>
  getNeighbours(unitId: UnitId): Promise<NeighbourState>
  postReading(reading: Omit<Reading, 'recorded_at'> & { recorded_at?: string }): Promise<{ accepted: true; unit: Unit }>
  postAccessEvent(event: Omit<AccessEvent, 'at'> & { at?: string }): Promise<{ accepted: true; event: AccessEvent; unit: Unit }>
  acknowledgeIncident(id: string, actor: { role: Role; name: string }): Promise<Incident>
  caregiverResponse(id: string, actor: { role: 'caregiver'; name: string; action: 'caregiver_checking_in' | 'township_requested' | 'resident_confirmed_safe' }): Promise<Incident>
  confirmHome(id: UnitId, actor: { role: 'caregiver'; name: string }): Promise<Unit>
  getAwayPeriods(id: UnitId): Promise<AwayPeriodDetail[]>
  addAwayPeriod(id: UnitId, body: { role: 'caregiver'; name: string; starts_at: string; ends_at: string; reason?: string | null }): Promise<Unit>
  cancelAwayPeriod(id: UnitId, periodId: string, actor: { role: 'caregiver'; name: string }): Promise<Unit>
  escalateIncident(id: string, actor: { role: Role; name: string; action: 'unable_to_verify' | 'emergency_called' }): Promise<Incident>
  closeIncident(id: string, actor: { role: Role; name: string; outcome: Exclude<Outcome, 'resident_activity_detected'>; report?: string; hospital_name?: string | null; hospital_sent_at?: string | null }): Promise<Incident>
  markNotificationsRead(role: Role): Promise<void>
  markNotificationRead(id: string, role: Role): Promise<Notification>
  respondToAwayActivity(id: string, body: { role: 'caregiver'; name: string; response: AwayActivityResponse }): Promise<Notification>
  respondToActivity(id: string, action: 'invite_resident' | 'join_together'): Promise<{ ok: true }>
  sendMessage(body: { unit_id: UnitId; from_name: string; preset_id: string }): Promise<CompanionMessage>
  requestBuddy(unitId: UnitId): Promise<BuddyMatch>
  setNeighbourConsent(unitId: UnitId, open: boolean): Promise<NeighbourState>
  requestNeighbourIntroduction(unitId: UnitId): Promise<NeighbourState>
  confirmDemoCall(id: string, confirmedSafe: true): Promise<Incident>
  resetDemo(): Promise<{ units: Unit[] }>
  // Demo-only: the home unit's quiet-gap watch runs only while a scenario plays.
  setMonitoring(active: boolean, timing?: CallTiming): Promise<{ unit_id: UnitId; active: boolean }>
  connect(onEvent: (event: RealtimeEvent) => void, onStatus?: (connected: boolean) => void): () => void
}
