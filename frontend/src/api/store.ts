import { useSyncExternalStore } from 'react'
import { api } from './index'
import type { Config, Incident, Notification, Reading, RealtimeEvent, Role, Status, Unit } from './types'

export interface StatusChange {
  unit_id: string
  status: Status
  previous_status: Status
  at: string
}

export interface AppState {
  connected: boolean
  loaded: boolean
  units: Unit[]
  incidents: Incident[]
  notifications: Notification[]
  statusHistory: StatusChange[]
  config: Config | null
  readingsByUnit: Record<string, Reading[]>
  snapshotRevision: number
}

let state: AppState = {
  connected: false, loaded: false, units: [], incidents: [], notifications: [], statusHistory: [], config: null,
  readingsByUnit: {}, snapshotRevision: 0,
}
const subscribers = new Set<() => void>()
const eventSubscribers = new Set<(event: RealtimeEvent) => void>()
export const subscribeAppEvents = (listener: (event: RealtimeEvent) => void) => {
  eventSubscribers.add(listener)
  return () => { eventSubscribers.delete(listener) }
}
const getSnapshot = () => state
export const getAppState = () => state
const subscribe = (listener: () => void) => { subscribers.add(listener); return () => { subscribers.delete(listener) } }
const setState = (next: AppState) => { state = next; subscribers.forEach(listener => listener()) }

function upsert<T>(items: T[], item: T, key: keyof T): T[] {
  const index = items.findIndex(value => value[key] === item[key])
  if (index < 0) return [...items, item]
  return items.map((value, position) => position === index ? item : value)
}

export function applyEvent(event: RealtimeEvent): void {
  switch (event.type) {
    case 'snapshot':
      setState({ ...state, loaded: true, ...event.data, statusHistory: [], readingsByUnit: {}, snapshotRevision: state.snapshotRevision + 1 })
      break
    case 'unit.updated': {
      const previous = state.units.find(unit => unit.unit_id === event.data.unit_id)
      const statusHistory = previous && previous.status !== event.data.status
        ? [...state.statusHistory, { unit_id: event.data.unit_id, status: event.data.status, previous_status: previous.status, at: event.data.status_since }]
        : state.statusHistory
      setState({ ...state, units: upsert(state.units, event.data, 'unit_id'), statusHistory })
      break
    }
    case 'incident.updated':
      setState({ ...state, incidents: upsert(state.incidents, event.data, 'incident_id') })
      break
    case 'notification.created':
      setState({ ...state, notifications: [event.data, ...state.notifications.filter(item => item.notification_id !== event.data.notification_id)] })
      break
    case 'notification.updated':
      setState({ ...state, notifications: upsert(state.notifications, event.data, 'notification_id') })
      break
    case 'reading.received':
      setState({ ...state, readingsByUnit: {
        ...state.readingsByUnit,
        [event.data.unit_id]: [...(state.readingsByUnit[event.data.unit_id] || []), event.data],
      } })
      break
    case 'companion.message_delivered':
      // Companion history loads from REST when its view opens.
      break
  }
  eventSubscribers.forEach(listener => listener(event))
}

/** Apply an incident returned by a REST action without waiting for its WebSocket echo. */
export const applyIncident = (incident: Incident) => applyEvent({ type: 'incident.updated', at: new Date().toISOString(), data: incident })

export function connectStore(): () => void {
  return api.connect(applyEvent, connected => setState({ ...state, connected }))
}

export async function loadUnitReadings(unitId: string, snapshotRevision: number): Promise<void> {
  const readings = await api.getReadings(unitId)
  if (state.snapshotRevision !== snapshotRevision) return
  const receivedDuringFetch = state.readingsByUnit[unitId] || []
  const merged = [...readings, ...receivedDuringFetch.filter(item => !readings.some(existing => existing.recorded_at === item.recorded_at && existing.sensor === item.sensor && existing.value === item.value))]
  merged.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
  setState({ ...state, readingsByUnit: { ...state.readingsByUnit, [unitId]: merged } })
}

export async function markRoleViewed(role: Role): Promise<void> {
  const ids = new Set(state.notifications.filter(item => item.role === role && !item.read).map(item => item.notification_id))
  if (ids.size === 0) return
  await api.markNotificationsRead(role)
  setState({
    ...state,
    notifications: state.notifications.map(item => ids.has(item.notification_id) ? { ...item, read: true } : item),
  })
}

export async function markNotificationViewed(id: string, role: Role): Promise<void> {
  const notification = await api.markNotificationRead(id, role)
  applyEvent({ type: 'notification.updated', at: new Date().toISOString(), data: notification })
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
