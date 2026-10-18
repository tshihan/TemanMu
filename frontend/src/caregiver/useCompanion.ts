import { useEffect, useState } from 'react'
import { api } from '../api'
import { ApiError } from '../api/live'
import { subscribeAppEvents } from '../api/store'
import type { BuddyMatch, CommunityActivity, CompanionMessage, MessagePreset } from '../api/types'

export type BuddyState =
  | { kind: 'loading' } | { kind: 'none' } | { kind: 'requesting' } | { kind: 'matched'; match: BuddyMatch }
  | { kind: 'not_found' } | { kind: 'error' }
export type ActivityAction = 'invite_resident' | 'join_together'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const IDLE: Record<ActivityAction, SaveState> = { invite_resident: 'idle', join_together: 'idle' }

/** Messages, Community Buddy and the nearby activity for one unit. Reloads after every demo reset. */
export function useCompanion(unitId: string | undefined, fromName: string | undefined, revision: number) {
  const [presets, setPresets] = useState<MessagePreset[]>([])
  const [messages, setMessages] = useState<CompanionMessage[]>([])
  const [buddy, setBuddy] = useState<BuddyState>({ kind: 'loading' })
  const [activity, setActivity] = useState<CommunityActivity | null>(null)
  const [responses, setResponses] = useState(IDLE)
  const [sending, setSending] = useState<string | null>(null)
  const [sendFailed, setSendFailed] = useState(false)

  useEffect(() => {
    if (!unitId) return
    let cancelled = false
    void Promise.allSettled([api.getMessagePresets(), api.getMessages(unitId), api.getBuddy(unitId), api.getActivities(unitId)]).then(([p, m, b, a]) => {
      if (cancelled) return
      setResponses(IDLE)
      setSendFailed(false)
      if (p.status === 'fulfilled') setPresets(p.value)
      if (m.status === 'fulfilled') setMessages(m.value)
      setBuddy(b.status === 'rejected' ? { kind: 'error' } : b.value ? { kind: 'matched', match: b.value } : { kind: 'none' })
      if (a.status === 'fulfilled') {
        const now = new Date().toISOString()
        setActivity(a.value.find(item => item.starts_at >= now) || a.value[0] || null)
      }
    })
    return () => { cancelled = true }
  }, [unitId, revision])

  useEffect(() => subscribeAppEvents(event => {
    if (event.type !== 'companion.message_delivered' || event.data.unit_id !== unitId) return
    setMessages(items => items.some(item => item.message_id === event.data.message_id) ? items : [event.data, ...items])
  }), [unitId])

  async function send(presetId: string): Promise<boolean> {
    if (!unitId || !fromName || sending) return false
    setSending(presetId)
    setSendFailed(false)
    try {
      const message = await api.sendMessage({ unit_id: unitId, from_name: fromName, preset_id: presetId })
      setMessages(items => items.some(item => item.message_id === message.message_id) ? items : [message, ...items])
      return true
    } catch {
      setSendFailed(true)
      return false
    } finally { setSending(null) }
  }

  async function requestBuddy(): Promise<void> {
    if (!unitId) return
    setBuddy({ kind: 'requesting' })
    try { setBuddy({ kind: 'matched', match: await api.requestBuddy(unitId) }) }
    catch (error) {
      if (error instanceof ApiError && error.status === 404) { setBuddy({ kind: 'not_found' }); return }
      // 409: already matched (e.g. requested from another tab), so show the existing match.
      const existing = error instanceof ApiError && error.status === 409 ? await api.getBuddy(unitId).catch(() => null) : null
      setBuddy(existing ? { kind: 'matched', match: existing } : { kind: 'error' })
    }
  }

  async function respond(action: ActivityAction): Promise<boolean> {
    if (!activity || responses[action] === 'saving' || responses[action] === 'saved') return false
    setResponses(items => ({ ...items, [action]: 'saving' }))
    try {
      await api.respondToActivity(activity.activity_id, action)
      setResponses(items => ({ ...items, [action]: 'saved' }))
      return true
    } catch {
      setResponses(items => ({ ...items, [action]: 'error' }))
      return false
    }
  }

  return { presets, messages, buddy, activity, responses, sending, sendFailed, send, requestBuddy, respond }
}
