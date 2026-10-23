import { ApiError } from '../api/live'
import type { Api, Incident, RealtimeEvent, Unit } from '../api/types'

type Method = Exclude<keyof Api, 'connect'> | 'primeInactivity' | 'settleHome'
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

// Reloading one tab starts a fresh demo: that tab resets the shared session and every other open tab
// reloads with it. Returns true for the tab the user reloaded.
const RELOAD_FLAG = 'temanmu-synced-reload'
function syncReloadAcrossTabs(): boolean {
  let synced = false
  try { synced = sessionStorage.getItem(RELOAD_FLAG) === '1'; sessionStorage.removeItem(RELOAD_FLAG) } catch { /* storage unavailable */ }
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  // A tab reloaded by another tab must not broadcast or reset again, or the tabs would reload each other forever.
  const userReload = navigation?.type === 'reload' && !synced
  if (typeof BroadcastChannel === 'undefined') return userReload
  const channel = new BroadcastChannel('temanmu-demo-reload')
  if (userReload) channel.postMessage('reload')
  channel.onmessage = () => {
    try { sessionStorage.setItem(RELOAD_FLAG, '1') } catch { /* storage unavailable */ }
    window.location.reload()
  }
  return userReload
}

function ensureWorker(): SharedWorker {
  if (worker) return worker
  const userReload = syncReloadAcrossTabs()
  worker = new SharedWorker(new URL('./shared-worker.ts', import.meta.url), { type: 'module', name: 'temanmu-demo-session' })
  worker.port.onmessage = handleMessage
  worker.port.onmessageerror = handleMessageError
  worker.port.start()
  window.addEventListener('pagehide', () => worker?.port.postMessage({ kind: 'disconnect' }), { once: true })
  // Sent before any other request, so this tab's first reads already see the fresh demo.
  if (userReload) void call('resetDemo').catch(error => console.error('Could not reset the demo after reload', error))
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
export const settleSharedMockHome = () => call<Unit>('settleHome')

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
  getNeighbours: unitId => call('getNeighbours', unitId),
  postReading: reading => call('postReading', reading),
  acknowledgeIncident: (id, actor) => call('acknowledgeIncident', id, actor),
  caregiverResponse: (id, actor) => call('caregiverResponse', id, actor),
  confirmHome: (id, actor) => call('confirmHome', id, actor),
  escalateIncident: (id, actor) => call('escalateIncident', id, actor),
  closeIncident: (id, actor) => call('closeIncident', id, actor),
  markNotificationsRead: role => call('markNotificationsRead', role),
  markNotificationRead: (id, role) => call('markNotificationRead', id, role),
  respondToActivity: (id, action) => call('respondToActivity', id, action),
  sendMessage: body => call('sendMessage', body),
  requestBuddy: unitId => call('requestBuddy', unitId),
  setNeighbourConsent: (unitId, open) => call('setNeighbourConsent', unitId, open),
  requestNeighbourIntroduction: unitId => call('requestNeighbourIntroduction', unitId),
  confirmDemoCall: (id, confirmedSafe) => call('confirmDemoCall', id, confirmedSafe),
  resetDemo: () => call('resetDemo'),
  setMonitoring: (active, timing) => call('setMonitoring', active, timing),
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
