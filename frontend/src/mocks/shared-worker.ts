import { mockApi, mockSnapshot, primeMockInactivity } from './api'
import type { Api, RealtimeEvent } from '../api/types'

type Method = Exclude<keyof Api, 'connect'>
type Request = { id: number; method: Method | 'primeInactivity'; args: unknown[] }
type Reply = { kind: 'reply'; id: number; result?: unknown; error?: { status?: number; message: string } }
type EventMessage = { kind: 'event'; event: RealtimeEvent }

const ports = new Set<MessagePort>()
const scope = self as unknown as { onconnect: (event: MessageEvent) => void }

mockApi.connect(event => {
  const message: EventMessage = { kind: 'event', event }
  for (const port of ports) port.postMessage(message)
})

scope.onconnect = event => {
  const port = event.ports[0]
  ports.add(port)
  port.start()
  port.postMessage({ kind: 'event', event: { type: 'snapshot', at: new Date().toISOString(), data: mockSnapshot() } } satisfies EventMessage)
  port.onmessage = async ({ data }: MessageEvent<Request | { kind: 'disconnect' }>) => {
    if ('kind' in data) {
      if (data.kind === 'disconnect') { ports.delete(port); port.close() }
      return
    }
    const { id, method, args } = data
    if (method === 'primeInactivity') {
      try {
        primeMockInactivity()
        port.postMessage({ kind: 'reply', id } satisfies Reply)
      } catch (error) {
        port.postMessage({ kind: 'reply', id, error: { message: error instanceof Error ? error.message : 'Could not start mock inactivity' } } satisfies Reply)
      }
      return
    }
    if (typeof mockApi[method] !== 'function') {
      port.postMessage({ kind: 'reply', id, error: { message: 'Unknown mock API method' } } satisfies Reply)
      return
    }
    try {
      const action = mockApi[method] as (...values: unknown[]) => Promise<unknown>
      const result = await action(...args)
      port.postMessage({ kind: 'reply', id, result } satisfies Reply)
    } catch (error) {
      port.postMessage({ kind: 'reply', id, error: {
        status: error instanceof Error && 'status' in error ? Number(error.status) : undefined,
        message: error instanceof Error ? error.message : 'Mock API request failed',
      } } satisfies Reply)
    }
  }
  port.onmessageerror = () => { ports.delete(port); port.close() }
}
