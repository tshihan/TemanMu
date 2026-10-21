import type { Api, RealtimeEvent } from './types'

// Same-origin URLs let a phone use the Vite proxy instead of resolving localhost on the phone.
// A separately hosted frontend can override both URLs at build time.
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const wsUrl = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null
    throw new ApiError(response.status, body?.detail || response.statusText)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
const query = (value: string) => encodeURIComponent(value)

export const liveApi: Api = {
  getConfig: () => request('/api/config'),
  getUnits: () => request('/api/units'),
  getUnit: id => request(`/api/units/${query(id)}`),
  getReadings: (id, since) => request(`/api/units/${query(id)}/readings${since ? `?since=${query(since)}` : ''}`),
  getUnitIncidents: (id, state) => request(`/api/units/${query(id)}/incidents${state ? `?state=${query(state)}` : ''}`),
  getIncident: id => request(`/api/incidents/${query(id)}`),
  getNotifications: role => request(`/api/notifications?role=${role}`),
  getActivities: unitId => request(`/api/community/activities${unitId ? `?unit_id=${query(unitId)}` : ''}`),
  getMessages: unitId => request(`/api/companion/messages?unit_id=${query(unitId)}`),
  getMessagePresets: () => request('/api/companion/message-presets'),
  getBuddy: unitId => request(`/api/companion/buddy?unit_id=${query(unitId)}`),
  getNeighbours: unitId => request(`/api/companion/neighbours?unit_id=${query(unitId)}`),
  postReading: reading => post('/api/readings', reading),
  acknowledgeIncident: (id, actor) => post(`/api/incidents/${query(id)}/acknowledge`, actor),
  caregiverResponse: (id, actor) => post(`/api/incidents/${query(id)}/caregiver-response`, actor),
  confirmHome: (id, actor) => post(`/api/units/${query(id)}/confirm-home`, actor),
  escalateIncident: (id, actor) => post(`/api/incidents/${query(id)}/escalate`, actor),
  closeIncident: (id, actor) => post(`/api/incidents/${query(id)}/close`, actor),
  markNotificationsRead: role => post('/api/notifications/read', { role }),
  markNotificationRead: (id, role) => post(`/api/notifications/${query(id)}/read`, { role }),
  respondToActivity: (id, action) => post(`/api/community/activities/${query(id)}/respond`, { action }),
  sendMessage: body => post('/api/companion/messages', body),
  requestBuddy: unit_id => post('/api/companion/buddy/request', { unit_id }),
  setNeighbourConsent: (unit_id, open) => post('/api/companion/neighbours/consent', { unit_id, open }),
  requestNeighbourIntroduction: unit_id => post('/api/companion/neighbours/introduce', { unit_id }),
  resetDemo: () => post('/api/demo/reset'),
  // keepalive: the 3D home turns monitoring off on pagehide, which must survive the unload.
  setMonitoring: active => request('/api/demo/monitoring', { method: 'POST', body: JSON.stringify({ active }), keepalive: true }),
  connect(onEvent, onStatus) {
    let closed = false
    let socket: WebSocket | undefined
    let retry: number | undefined
    let attempt = 0

    const open = () => {
      socket = new WebSocket(wsUrl)
      socket.onopen = () => { attempt = 0; onStatus?.(true) }
      socket.onmessage = message => {
        try { onEvent(JSON.parse(message.data) as RealtimeEvent) }
        catch (error) { console.error('Invalid TemanMu event', error) }
      }
      socket.onclose = () => {
        onStatus?.(false)
        if (!closed) retry = window.setTimeout(open, Math.min(1000 * 2 ** attempt++, 10000))
      }
      socket.onerror = () => socket?.close()
    }
    open()
    return () => {
      closed = true
      window.clearTimeout(retry)
      socket?.close()
    }
  },
}
