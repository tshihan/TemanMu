import { useEffect, useState } from 'react'
import { api } from '../api'
import { ApiError } from '../api/live'
import type { BuddyMatch, CommunityActivity, NeighbourState } from '../api/types'

export type BuddyState =
  | { kind: 'loading' } | { kind: 'none' } | { kind: 'requesting' } | { kind: 'matched'; match: BuddyMatch }
  | { kind: 'not_found' } | { kind: 'error' }
export type NeighboursState =
  | { kind: 'loading' } | { kind: 'ready'; state: NeighbourState } | { kind: 'saving'; state: NeighbourState }
  | { kind: 'error' }
export type ActivityAction = 'invite_resident' | 'join_together'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const IDLE: Record<ActivityAction, SaveState> = { invite_resident: 'idle', join_together: 'idle' }

/** Community Buddy, same-hour neighbours and the nearby activity for one unit. Reloads after every demo reset. */
export function useCompanion(unitId: string | undefined, revision: number) {
  const [buddy, setBuddy] = useState<BuddyState>({ kind: 'loading' })
  const [activity, setActivity] = useState<CommunityActivity | null>(null)
  const [responses, setResponses] = useState(IDLE)
  const [neighbours, setNeighbours] = useState<NeighboursState>({ kind: 'loading' })

  useEffect(() => {
    if (!unitId) return
    let cancelled = false
    void Promise.allSettled([api.getBuddy(unitId), api.getActivities(unitId), api.getNeighbours(unitId)]).then(([b, a, n]) => {
      if (cancelled) return
      setResponses(IDLE)
      setNeighbours(n.status === 'fulfilled' ? { kind: 'ready', state: n.value } : { kind: 'error' })
      setBuddy(b.status === 'rejected' ? { kind: 'error' } : b.value ? { kind: 'matched', match: b.value } : { kind: 'none' })
      if (a.status === 'fulfilled') {
        const now = new Date().toISOString()
        setActivity(a.value.find(item => item.starts_at >= now) || a.value[0] || null)
      }
    })
    return () => { cancelled = true }
  }, [unitId, revision])

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

  async function reloadNeighbours(): Promise<void> {
    if (!unitId) return
    setNeighbours({ kind: 'loading' })
    try { setNeighbours({ kind: 'ready', state: await api.getNeighbours(unitId) }) }
    catch { setNeighbours({ kind: 'error' }) }
  }

  async function saveNeighbours(change: (id: string) => Promise<NeighbourState>): Promise<boolean> {
    if (!unitId || neighbours.kind !== 'ready') return false
    setNeighbours({ kind: 'saving', state: neighbours.state })
    try { setNeighbours({ kind: 'ready', state: await change(unitId) }); return true }
    catch (error) {
      // 409/404: the state moved on (another tab, a withdrawal), so show what is true now.
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) await reloadNeighbours()
      else setNeighbours({ kind: 'ready', state: neighbours.state })
      return false
    }
  }

  const setNeighbourConsent = (open: boolean) => saveNeighbours(id => api.setNeighbourConsent(id, open))
  const requestIntroduction = () => saveNeighbours(id => api.requestNeighbourIntroduction(id))

  return { buddy, activity, responses, requestBuddy, respond, neighbours, reloadNeighbours, setNeighbourConsent, requestIntroduction }
}
