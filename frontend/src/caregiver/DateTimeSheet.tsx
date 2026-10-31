import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import { dateTime, fromLocalInput, localInput, TZ } from './format'

const DAY = 864e5
const STRIP_DAYS = 21

interface Props {
  /** Eyebrow in the sheet: "Away from", "Away until", "Expected return". */
  label: string
  /** `YYYY-MM-DDTHH:mm` in Malaysia time, the same string a datetime-local input would hold. */
  value: string
  onChange: (value: string) => void
  /** Start fields offer "Now"; end fields must be after now. */
  kind: 'start' | 'end'
  now: number
  disabled?: boolean
  /** The field sits on --tile2 in cards and on --tile inside sheets. */
  onSheet?: boolean
}

interface Draft { date: string; h: number; m: number }
const parse = (value: string): Draft => ({ date: value.slice(0, 10), h: Number(value.slice(11, 13)) || 0, m: Number(value.slice(14, 16)) || 0 })
const format = ({ date, h, m }: Draft) => `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
const fmt = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...options }).format(new Date(fromLocalInput(`${date}T12:00`)))

/** A field that opens a bottom sheet for choosing a Malaysia-time date and time. Replaces datetime-local. */
export function DateTimeSheet({ label, value, onChange, kind, now, disabled, onSheet }: Props) {
  const field = useRef<HTMLButtonElement>(null)
  const [host, setHost] = useState<Element | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const parsed = fromLocalInput(value)

  function open() {
    setHost(field.current?.closest('.cg-app') ?? null)
    setDraft(parse(value || localInput(now + DAY)))
  }
  const close = () => { setDraft(null); field.current?.focus() }

  return <>
    <button ref={field} type="button" className={`cg-datefield ${onSheet ? 'is-on-sheet' : ''}`} onClick={open} disabled={disabled}
      aria-haspopup="dialog" aria-label={`${label}: ${Number.isNaN(parsed) ? 'not set' : dateTime(parsed)}`}>
      <span className="cg-num">{Number.isNaN(parsed) ? 'Choose…' : dateTime(parsed)}</span>
      <CalendarDays size={18} aria-hidden="true" />
    </button>
    {draft && host && createPortal(<Sheet label={label} kind={kind} now={now} draft={draft} setDraft={setDraft} onCancel={close}
      onDone={next => { onChange(next); close() }} />, host)}
  </>
}

function Sheet({ label, kind, now, draft, setDraft, onCancel, onDone }: {
  label: string; kind: 'start' | 'end'; now: number; draft: Draft; setDraft: (draft: Draft) => void; onCancel: () => void; onDone: (value: string) => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const cancelRef = useRef(onCancel)
  useEffect(() => { cancelRef.current = onCancel })
  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"], button')?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelRef.current() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const value = format(draft)
  const at = fromLocalInput(value)
  const error = kind === 'end' && !(at > now) ? 'Choose a time after now.' : ''
  const dayAt = (offset: number) => localInput(now + offset * DAY).slice(0, 10)
  const days = Array.from({ length: STRIP_DAYS }, (_, index) => dayAt(index))
  const pm = draft.h >= 12
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch })

  return <div className="cg-scrim is-top" onClick={event => { if (event.target === event.currentTarget) onCancel() }}>
    <div ref={panel} className="cg-bottom-sheet cg-picker" role="dialog" aria-modal="true" aria-labelledby="cg-picker-label">
      <span className="cg-grab" aria-hidden="true" />
      <div className="cg-picker-head">
        <span id="cg-picker-label" className="cg-eyebrow">{label}</span>
        <strong className="cg-picker-summary cg-num" aria-live="polite">{dateTime(at)}</strong>
      </div>
      <div className="cg-picker-days">
        <span className="cg-eyebrow">{fmt(draft.date, { month: 'long', year: 'numeric' })}</span>
        <div className="cg-day-strip" role="group" aria-label="Day">
          {days.map((date, index) => {
            const on = date === draft.date
            return <button key={date} type="button" className={on ? 'is-on' : ''} aria-pressed={on} onClick={() => set({ date })}
              aria-label={fmt(date, { weekday: 'long', day: 'numeric', month: 'long' })}>
              <span>{index ? fmt(date, { weekday: 'short' }) : 'Today'}</span>
              <strong className="cg-num">{fmt(date, { day: 'numeric' })}</strong>
            </button>
          })}
        </div>
      </div>
      <div className="cg-time-card">
        <Stepper label="hour" value={String(draft.h % 12 || 12)} onUp={() => set({ h: (draft.h + 1) % 24 })} onDown={() => set({ h: (draft.h + 23) % 24 })} />
        <span className="cg-time-colon" aria-hidden="true">:</span>
        <Stepper label="minute" value={String(draft.m).padStart(2, '0')} onUp={() => set({ m: (Math.floor(draft.m / 5) * 5 + 5) % 60 })}
          onDown={() => set({ m: draft.m % 5 ? Math.floor(draft.m / 5) * 5 : (draft.m + 55) % 60 })} />
        <div className="cg-ampm" role="radiogroup" aria-label="AM or PM">
          <button type="button" role="radio" aria-checked={!pm} className={!pm ? 'is-on' : ''} onClick={() => set({ h: draft.h % 12 })}>AM</button>
          <button type="button" role="radio" aria-checked={pm} className={pm ? 'is-on' : ''} onClick={() => set({ h: draft.h % 12 + 12 })}>PM</button>
        </div>
      </div>
      {error && <p className="cg-picker-error" role="alert">{error}</p>}
      <div className="cg-sheet-actions">
        <button type="button" className="cg-btn cg-btn-tile" onClick={onCancel}>Cancel</button>
        <button type="button" className="cg-btn cg-btn-accent" onClick={() => onDone(value)} disabled={!!error}>Done</button>
      </div>
    </div>
  </div>
}

function Stepper({ label, value, onUp, onDown }: { label: string; value: string; onUp: () => void; onDown: () => void }) {
  return <div className="cg-stepper">
    <button type="button" onClick={onUp} aria-label={`Later ${label}`}><ChevronUp size={22} aria-hidden="true" /></button>
    <span className="cg-num" aria-label={label}>{value}</span>
    <button type="button" onClick={onDown} aria-label={`Earlier ${label}`}><ChevronDown size={22} aria-hidden="true" /></button>
  </div>
}
