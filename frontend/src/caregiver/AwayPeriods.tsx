import { useState, type FormEvent } from 'react'
import { CalendarPlus } from 'lucide-react'
import { api } from '../api'
import { ApiError } from '../api/live'
import { applyEvent } from '../api/store'
import type { AwayPeriod, Unit } from '../api/types'
import { awayStarted, GUARD, type Ctx } from './copy'
import { dateTime, fromLocalInput, localInput } from './format'

const SUGGESTIONS = ['Holiday', 'Hospital stay', 'Staying with family']
const DAY = 864e5

interface Props { unit: Unit; ctx: Ctx; now: number; reasons: Record<string, string | null>; onToast: (text: string) => void }

/** Settings card: the caregiver declares times the resident won't be home, for any reason. */
export function AwayPeriods({ unit, ctx, now, reasons, onToast }: Props) {
  const { R } = ctx
  const [adding, setAdding] = useState(false)
  const [reason, setReason] = useState('')
  const [startsNow, setStartsNow] = useState(true)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [busy, setBusy] = useState<string | null>(null) // 'add' or the period being ended
  const [error, setError] = useState<string | null>(null)
  const periods = unit.away_periods.filter(period => Date.parse(period.ends_at) > now)
  const actor = { role: 'caregiver' as const, name: unit.caregiver_name }

  const apply = (updated: Unit) => applyEvent({ type: 'unit.updated', at: updated.status_since, data: updated })
  // Only 409s carry a sentence meant for people ("This overlaps another away period").
  const failure = (cause: unknown, fallback: string) => cause instanceof ApiError && cause.status === 409 ? cause.message : fallback

  function openForm() {
    setAdding(true); setError(null); setReason(''); setStartsNow(true)
    setStart(localInput(now)); setEnd(localInput(now + DAY))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    // The server starts a period in the past from now, so a second-old `now` is fine.
    const startsAt = startsNow ? now : fromLocalInput(start)
    const endsAt = fromLocalInput(end)
    if (Number.isNaN(startsAt) || Number.isNaN(endsAt) || endsAt <= Math.max(startsAt, now))
      return setError('The end must be in the future and after the start.')
    if (endsAt - startsAt > 90 * DAY) return setError('An away period can last at most 90 days.')
    setBusy('add'); setError(null)
    try {
      apply(await api.addAwayPeriod(unit.unit_id, {
        ...actor, reason: reason.trim() || null, starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(),
      }))
      setAdding(false)
      onToast('Away period saved')
    } catch (cause) {
      setError(failure(cause, 'Couldn’t save the away period. Please try again.'))
    } finally { setBusy(null) }
  }

  async function finish(period: AwayPeriod, active: boolean) {
    const question = active ? `End this away period now? Inactivity checks for ${R} restart from now.` : 'Cancel this upcoming away period?'
    if (busy || !window.confirm(question)) return
    setBusy(period.period_id); setError(null)
    try {
      apply(await api.cancelAwayPeriod(unit.unit_id, period.period_id, actor))
      onToast(active ? 'Away period ended' : 'Away period cancelled')
    } catch (cause) {
      const latest = await api.getUnit(unit.unit_id).catch(() => null)
      if (latest) apply(latest)
      setError(failure(cause, 'Couldn’t update the away period. Please try again.'))
    } finally { setBusy(null) }
  }

  return <section className="cg-card cg-away" aria-labelledby="cg-away-heading">
    <h2 id="cg-away-heading" className="cg-setting-title">Away from home</h2>
    <p className="cg-card-lead">Let TemanMu know when {R} won’t be home, for any reason. Inactivity alerts pause until {R} is due back.
      You’ll still be alerted if water or power is left running.</p>

    {periods.length > 0 && <ul className="cg-away-list">
      {periods.map(period => {
        const active = awayStarted(period, now)
        return <li key={period.period_id} className={`cg-away-item ${active ? 'is-active' : ''}`}>
          <span className="cg-away-text">
            <strong>{reasons[period.period_id] || 'Away'}</strong>
            <span>{active ? `Away now · until ${dateTime(period.ends_at)}` : `${dateTime(period.starts_at)} → ${dateTime(period.ends_at)}`}</span>
          </span>
          <button type="button" className="cg-away-end" onClick={() => void finish(period, active)} disabled={busy !== null}>
            {busy === period.period_id ? 'Saving…' : active ? 'End now' : 'Cancel'}
          </button>
        </li>
      })}
    </ul>}

    {adding ? <form className="cg-away-form" onSubmit={event => void submit(event)} noValidate>
      <label className="cg-field"><span>Reason <span className="cg-field-note">(optional)</span></span>
        <input value={reason} onChange={event => setReason(event.target.value)} maxLength={200} placeholder="e.g. Staying with Auntie in Ipoh" autoFocus
          aria-describedby="cg-away-private" />
      </label>
      <p id="cg-away-private" className="cg-away-hint">Only you can see the reason. {GUARD} only sees that {R} is away.</p>
      <div className="cg-away-chips" role="group" aria-label="Common reasons">
        {SUGGESTIONS.map(text => <button key={text} type="button" className="cg-away-chip" aria-pressed={reason === text} onClick={() => setReason(text)}>{text}</button>)}
      </div>
      <label className="cg-check"><input type="checkbox" checked={startsNow} onChange={event => setStartsNow(event.target.checked)} />Starting now</label>
      {!startsNow && <label className="cg-field"><span>From</span>
        <input type="datetime-local" value={start} onChange={event => setStart(event.target.value)} />
      </label>}
      <label className="cg-field"><span>Until</span>
        <input type="datetime-local" value={end} onChange={event => setEnd(event.target.value)} />
      </label>
      {error && <p role="alert" className="cg-away-error">{error}</p>}
      <div className="cg-away-actions">
        <button type="button" className="cg-btn cg-btn-outline" onClick={() => setAdding(false)} disabled={busy === 'add'}>Cancel</button>
        <button type="submit" className="cg-btn cg-btn-accent" disabled={busy === 'add'}>{busy === 'add' ? 'Saving…' : 'Save'}</button>
      </div>
    </form> : <>
      {error && <p role="alert" className="cg-away-error">{error}</p>}
      <button type="button" className="cg-btn cg-btn-outline" onClick={openForm}><CalendarPlus size={18} aria-hidden="true" />Add away period</button>
    </>}
  </section>
}
