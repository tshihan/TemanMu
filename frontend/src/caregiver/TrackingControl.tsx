import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { House, Pause, Play } from 'lucide-react'
import { api } from '../api'
import { ApiError } from '../api/live'
import { applyEvent } from '../api/store'
import type { AwayPeriod, Unit } from '../api/types'
import { DateTimeSheet } from './DateTimeSheet'
import { dateTime, fromLocalInput, localInput } from './format'

/** inCard: the Return home button on the hospital status card. Otherwise the tracking button in the
 *  actions row, which stays visible but disabled while the resident is in hospital. */
interface Props { unit: Unit; relationship: string; away: AwayPeriod | null; blocked: boolean; now: number; inCard?: boolean }

export function TrackingControl({ unit, relationship, away, blocked, now, inCard = false }: Props) {
  const hospital = unit.care_state === 'in_hospital'
  const dialog = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [host, setHost] = useState<Element | null>(null)
  const [open, setOpen] = useState(false)
  const [end, setEnd] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const button = trigger.current
    const panel = dialog.current!
    const app = panel.closest('.cg-app')!
    const siblings = [...app.children].filter(child => child !== panel.parentElement) as HTMLElement[]
    const previous = siblings.map(child => child.inert)
    siblings.forEach(child => { child.inert = true })
    panel.querySelector<HTMLButtonElement>('button')?.focus()
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); if (!busy) setOpen(false) }
      if (event.key !== 'Tab') return
      const targets = [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')]
      const first = targets[0], last = targets.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    panel.addEventListener('keydown', keydown)
    return () => {
      panel.removeEventListener('keydown', keydown)
      siblings.forEach((child, index) => { child.inert = previous[index] })
      button?.focus()
    }
  }, [open, busy])

  function showConfirmation() {
    setHost(trigger.current!.closest('.cg-app'))
    setEnd(localInput(now + 864e5))
    setError(null)
    setOpen(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if ((hospital || !away) && blocked) return setError('Record an outcome for the current alert before changing tracking.')
    const endsAt = fromLocalInput(end)
    if (!hospital && !away && (!Number.isFinite(endsAt) || endsAt <= now || endsAt - now > 90 * 864e5))
      return setError('Choose a future return time within 90 days.')
    setBusy(true)
    setError(null)
    const actor = { role: 'caregiver' as const, name: unit.caregiver_name }
    try {
      const updated = hospital
        ? await api.confirmHome(unit.unit_id, actor)
        : away
        ? await api.cancelAwayPeriod(unit.unit_id, away.period_id, actor)
        : await api.addAwayPeriod(unit.unit_id, { ...actor, starts_at: new Date(now).toISOString(), ends_at: new Date(endsAt).toISOString(), reason: null })
      applyEvent({ type: 'unit.updated', at: updated.status_since, data: updated })
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 409 ? cause.message : 'Couldn’t update tracking. Please try again.')
    } finally { setBusy(false) }
  }

  if (inCard && !hospital) return null
  // In hospital, monitoring is already paused; Return home on the status card is how it ends.
  if (hospital && !inCard) return <button type="button" className="cg-action is-tile" disabled title={`Paused while ${relationship} is in hospital`}>
    <Pause size={18} aria-hidden="true" />Stop tracking
  </button>

  return <>
    {inCard
      ? <button ref={trigger} type="button" className="cg-btn cg-btn-outline cg-hospital-return" onClick={showConfirmation}>
        <House size={18} aria-hidden="true" />Return home
      </button>
      : <button ref={trigger} type="button" className="cg-action is-tile" onClick={showConfirmation}>
        {away ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
        {away ? 'Resume tracking' : 'Stop tracking'}
      </button>}
    {open && host && createPortal(<div className="cg-scrim" onClick={event => { if (event.target === event.currentTarget && !busy) setOpen(false) }}>
    <div ref={dialog} role="dialog" aria-modal="true" className="cg-bottom-sheet cg-tracking" aria-labelledby="cg-tracking-title" aria-describedby="cg-tracking-description">
      <form onSubmit={event => void submit(event)}>
        <h2 id="cg-tracking-title">{hospital ? `${relationship} has returned home?` : away ? 'Resume tracking?' : 'Stop tracking temporarily?'}</h2>
        <p id="cg-tracking-description">{hospital
          ? `Confirm only after speaking directly with ${relationship} and verifying they have returned home from hospital. Inactivity monitoring will restart from now.`
          : away
          ? `Inactivity checks for ${relationship} will restart from now.`
          : `Pause inactivity checks while ${relationship} is away. Tracking will resume automatically at the return time you choose. Water and power safety alerts stay on.`}</p>
        {hospital ? null : away ? <p>Currently paused until {dateTime(away.ends_at)}.</p> : <div className="cg-field">
          <span>Expected return (Malaysia time)</span>
          <DateTimeSheet label="Expected return" kind="end" value={end} onChange={setEnd} now={now} disabled={busy} onSheet />
        </div>}
        {(hospital || !away) && blocked && <p role="alert" className="cg-form-error">Record an outcome for the current alert before changing tracking.</p>}
        {error && <p role="alert" className="cg-form-error">{error}</p>}
        <div className="cg-sheet-actions">
          <button type="button" className="cg-btn cg-btn-tile" onClick={() => setOpen(false)} disabled={busy} autoFocus>Cancel</button>
          <button type="submit" className="cg-btn cg-btn-accent" disabled={busy || ((hospital || !away) && blocked)}>
            {busy ? 'Saving…' : hospital ? 'Confirm return' : away ? 'Resume tracking' : 'Stop tracking'}
          </button>
        </div>
      </form>
    </div>
    </div>, host)}
  </>
}
