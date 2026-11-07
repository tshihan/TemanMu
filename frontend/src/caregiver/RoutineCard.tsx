// TODO(design): the "usual quiet gaps" and "usual outings" cards need refining. Shown together on
// the caregiver home tab they make the page much more confusing; simplify or merge them, or move
// them off the home tab, before treating them as final.
import { useState } from 'react'
import { learnedDay, storyDuration, usualOutings } from '../api/learnedBaseline'
import type { Unit } from '../api/types'

const CEILING_MINUTES = 9 * 60
const TICKS = [0, 3, 6, 9]
const hourLabel = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`

/** The resident's learned quiet gap for each hour of the day, from the Quiet Gap Model. */
export function RoutineCard({ unit, relationship: R }: { unit: Unit; relationship: string }) {
  const learned = unit.baseline.learned_quiet_gap
  const day = learnedDay(unit.unit_id)
  const sceneHour = learned ? Number(learned.scene_time.slice(0, 2)) : 0
  const [hour, setHour] = useState<number | null>(null)
  if (!learned || !day) return null
  const shown = hour ?? sceneHour

  return <section className="cg-day cg-routine" aria-labelledby="cg-routine-heading">
    <div className="cg-day-head">
      <h2 id="cg-routine-heading">{R}’s usual quiet gaps</h2>
      <span>Learned · {learned.trained_days} days</span>
    </div>
    <p className="cg-routine-lead">How long {R} normally goes without using water, by the time of her last use. If a gap runs longer, TemanMu calls her.</p>
    <p className="cg-routine-readout" aria-live="polite">
      <strong className="cg-num">{storyDuration(day[shown])}</strong>
      <span>after water use at {hourLabel(shown)}{shown === sceneHour && hour === null ? ' (demo scene)' : ''}</span>
    </p>
    <div className="cg-routine-plot">
      <div className="cg-routine-ticks" aria-hidden="true">{TICKS.map(tick => <span key={tick} style={{ bottom: `${tick * 60 / CEILING_MINUTES * 100}%` }}>{tick}h</span>)}</div>
      <div className="cg-routine-bars" role="img" onPointerLeave={() => setHour(null)}
        aria-label={`Usual quiet gap by hour: ${day.map((minutes, h) => `${hourLabel(h)} ${storyDuration(minutes)}`).join(', ')}`}>
        {TICKS.map(tick => <i key={tick} className="cg-routine-grid" style={{ bottom: `${tick * 60 / CEILING_MINUTES * 100}%` }} />)}
        {day.map((minutes, h) => <span key={h} className={`cg-routine-col ${h === sceneHour ? 'is-scene' : ''} ${h === shown ? 'is-shown' : ''}`}
          onPointerEnter={() => setHour(h)} onPointerDown={() => setHour(h)}>
          <b style={{ height: `${minutes / CEILING_MINUTES * 100}%` }} />
        </span>)}
      </div>
    </div>
    <div className="cg-axis cg-routine-axis" aria-hidden="true">{['12a', '6a', '12p', '6p', '12a'].map((label, index) => <span key={index}>{label}</span>)}</div>
    <p className="cg-routine-note">Learned by the {learned.model} from {R}’s simulated water history. Short in the busy morning, long overnight.</p>
  </section>
}

const DAY_SHORT: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
const OUTING_SCALE_MINUTES = 4 * 60
const clockLabel = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
const daysLabel = (days: string[]) => days.length === 7 ? 'Every day' : days.map(day => DAY_SHORT[day]).join(', ')
const limitLabel = ([lo, hi]: number[]) => lo === hi ? storyDuration(lo) : `${storyDuration(lo)}–${storyDuration(hi)}`

/** Her regular outings by card tap-out time, from the Outing Model: usual length and when TemanMu checks. */
export function OutingsCard({ unit, relationship: R }: { unit: Unit; relationship: string }) {
  const learned = unit.baseline.learned_outing
  const rows = usualOutings(unit.unit_id)
  if (!learned || !rows?.length) return null
  const width = (minutes: number) => `${Math.min(1, minutes / OUTING_SCALE_MINUTES) * 100}%`

  return <section className="cg-day cg-routine" aria-labelledby="cg-outings-heading">
    <div className="cg-day-head">
      <h2 id="cg-outings-heading">{R}’s usual outings</h2>
      <span>Learned · {learned.trained_days} days</span>
    </div>
    <p className="cg-routine-lead">When {R} taps her card out, how long she is usually away. If she isn’t back by the check time, TemanMu calls her.</p>
    <ul className="cg-outings">
      {rows.map(row => <li key={`${row.tap_out}-${row.days.join()}`}>
        <div className="cg-outing-when"><strong className="cg-num">{clockLabel(row.tap_out)}</strong><span>{daysLabel(row.days)}</span></div>
        <div className="cg-outing-bar" aria-hidden="true">
          <i className="is-limit" style={{ width: width(row.limit_minutes[1]) }} />
          <i className="is-usual" style={{ width: width(row.usual_minutes) }} />
        </div>
        <p className="cg-outing-text">Usually <strong className="cg-num">{storyDuration(row.usual_minutes)}</strong> · check after <strong className="cg-num">{limitLabel(row.limit_minutes)}</strong></p>
      </li>)}
    </ul>
    <div className="cg-legend cg-outing-legend" aria-hidden="true"><span className="is-usual">Usually out</span><span className="is-limit">Until check</span></div>
    <p className="cg-routine-note">Learned by the {learned.model} from {R}’s simulated card taps. Longer on market mornings.</p>
  </section>
}
