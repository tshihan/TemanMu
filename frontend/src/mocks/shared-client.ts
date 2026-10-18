import { ApiError } from '../api/live'
import type { Api, Incident, RealtimeEvent } from '../api/types'

type Method = Exclude<keyof Api, 'connect'> | 'primeInactivity'
type Reply = { kind: 'reply'; id: number; result?: unknown; error?: { status?: number; message: string } }
type EventMessage = { kind: 'event'; event: RealtimeEvent }

let worker: SharedWorker | null = null
const listeners = new Set<(event: RealtimeEvent) => void>()
const statusListeners = new Set<(connected: boolean) => void>()
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()
let requestId = 0
let latestSnapshot: RealtimeEvent | null = null

function handleMessage({ data }: MessageEvent<Reply | EventMessage>) {
  if (data.kind === 'event') {
    if (data.event.type === 'snapshot') latestSnapshot = data.event
    listeners.forEach(listener => listener(data.event))
    return
  }
  const request = pending.get(data.id)
  if (!request) return
  pending.delete(data.id)
  if (data.error) request.reject(new ApiError(data.error.status ?? 500, data.error.message))
  else request.resolve(data.result)
}
function handleMessageError() {
  for (const request of pending.values()) request.reject(new Error('Mock session connection lost'))
  pending.clear()
  statusListeners.forEach(listener => listener(false))
}

function ensureWorker(): SharedWorker {
  if (worker) return worker
  worker = new SharedWorker(new URL('./shared-worker.ts', import.meta.url), { type: 'module', name: 'temanmu-demo-session' })
  worker.port.onmessage = handleMessage
  worker.port.onmessageerror = handleMessageError
  worker.port.start()
  window.addEventListener('pagehide', () => worker?.port.postMessage({ kind: 'disconnect' }), { once: true })
  return worker
}

function call<T>(method: Method, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = ++requestId
    pending.set(id, { resolve: value => resolve(value as T), reject })
    ensureWorker().port.postMessage({ id, method, args })
  })
}

export const primeSharedMockInactivity = () => call<Incident | undefined>('primeInactivity')

export const sharedMockApi: Api = {
  getConfig: () => call('getConfig'),
  getUnits: () => call('getUnits'),
  getUnit: id => call('getUnit', id),
  getReadings: (id, since) => call('getReadings', id, since),
  getUnitIncidents: (id, state) => call('getUnitIncidents', id, state),
  getIncident: id => call('getIncident', id),
  getNotifications: role => call('getNotifications', role),
  getActivities: unitId => call('getActivities', unitId),
  getMessages: unitId => call('getMessages', unitId),
  getMessagePresets: () => call('getMessagePresets'),
  getBuddy: unitId => call('getBuddy', unitId),
  postReading: reading => call('postReading', reading),
  acknowledgeIncident: (id, actor) => call('acknowledgeIncident', id, actor),
  escalateIncident: (id, actor) => call('escalateIncident', id, actor),
  closeIncident: (id, actor) => call('closeIncident', id, actor),
  markNotificationsRead: role => call('markNotificationsRead', role),
  markNotificationRead: (id, role) => call('markNotificationRead', id, role),
  respondToActivity: (id, action) => call('respondToActivity', id, action),
  sendMessage: body => call('sendMessage', body),
  requestBuddy: unitId => call('requestBuddy', unitId),
  resetDemo: () => call('resetDemo'),
  setMonitoring: active => call('setMonitoring', active),
  connect(onEvent, onStatus) {
    listeners.add(onEvent)
    if (onStatus) statusListeners.add(onStatus)
    ensureWorker()
    queueMicrotask(() => {
      if (!listeners.has(onEvent)) return
      onStatus?.(true)
      if (latestSnapshot) onEvent(latestSnapshot)
    })
    return () => {
      listeners.delete(onEvent)
      if (onStatus) statusListeners.delete(onStatus)
      onStatus?.(false)
    }
  },
}
