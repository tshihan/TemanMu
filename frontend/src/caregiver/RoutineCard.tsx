import { Moon, Phone, Sun, Sunrise, Sunset } from 'lucide-react'
import { learnedDay, usualOutings } from '../api/learnedBaseline'
import type { Unit } from '../api/types'

/** 135 -> "2¼ hrs", 540 -> "9 hrs", 50 -> "50 min". Rounded to the quarter hour so it reads like speech. */
const friendlyLength = (minutes: number) => {
  const quarters = Math.round(minutes / 15)
  if (quarters < 4) return `${Math.round(minutes / 5) * 5} min`
  const whole = Math.floor(quarters / 4)
  const part = ['', '¼', '½', '¾'][quarters % 4]
  return `${whole}${part} ${quarters === 4 ? 'hr' : 'hrs'}`
}
const hourLabel = (hour: number) => `${hour % 12 || 12} ${hour % 24 < 12 ? 'AM' : 'PM'}`

const PERIODS = [
  { name: 'Morning', from: 6, to: 12, Icon: Sunrise },
  { name: 'Afternoon', from: 12, to: 18, Icon: Sun },
  { name: 'Evening', from: 18, to: 21, Icon: Sunset },
  { name: 'Night', from: 21, to: 30, Icon: Moon },
]
const LONGEST_GAP = 9 * 60

/** The longest quiet gap the Quiet Gap Model allows in each part of the day, before TemanMu calls. */
export function RoutineCard({ unit, relationship: R }: { unit: Unit; relationship: string }) {
  const learned = unit.baseline.learned_quiet_gap
  const day = learnedDay(unit.unit_id)
  if (!learned || !day) return null
  const periods = PERIODS.map(period => {
    const hours = Array.from({ length: period.to - period.from }, (_, i) => day[(period.from + i) % 24])
    return { ...period, limit: Math.max(...hours) }
  })

  return <>
    <p className="cg-sheet-note">TemanMu calls {R} if she goes longer than this without water.</p>
    <ul className="cg-card cg-rt-list" aria-label={`Longest time ${R} usually goes without water`}>
      {periods.map(({ name, from, to, Icon, limit }) => <li key={name} className="cg-rt-row">
        <span className="cg-rt-icon is-water"><Icon size={18} aria-hidden="true" /></span>
        <div className="cg-rt-main">
          <div className="cg-rt-line">
            <strong>{name}</strong>
            <span className="cg-rt-value">up to <b className="cg-num">{friendlyLength(limit)}</b></span>
          </div>
          <span className="cg-rt-sub cg-num">{hourLabel(from)} – {hourLabel(to)}</span>
          <span className="cg-rt-bar" aria-hidden="true"><i style={{ width: `${Math.min(1, limit / LONGEST_GAP) * 100}%` }} /></span>
        </div>
      </li>)}
    </ul>
    <p className="cg-sheet-note cg-rt-foot">Learned from {learned.trained_days} days of {R}’s water use.</p>
  </>
}

const DAYS = [['mon', 'M', 'Mon'], ['tue', 'T', 'Tue'], ['wed', 'W', 'Wed'], ['thu', 'T', 'Thu'], ['fri', 'F', 'Fri'], ['sat', 'S', 'Sat'], ['sun', 'S', 'Sun']]
/** "07:00" + 80 -> "8:20 AM", rounded to 5 minutes. */
const clockAfter = (hhmm: string, minutes = 0) => {
  const [h, m] = hhmm.split(':').map(Number)
  const total = Math.round((h * 60 + m + minutes) / 5) * 5
  const hour = Math.floor(total / 60) % 24
  return `${hour % 12 || 12}:${String(total % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}

/** Her regular outings by card tap-out time, from the Outing Model: when she leaves, is usually back, and the latest TemanMu waits. */
export function OutingsCard({ unit, relationship: R }: { unit: Unit; relationship: string }) {
  const learned = unit.baseline.learned_outing
  const rows = usualOutings(unit.unit_id)
  if (!learned || !rows?.length) return null

  return <>
    <p className="cg-sheet-note">If {R} isn’t back in time, TemanMu calls her.</p>
    <ul className="cg-card cg-rt-list" aria-label={`${R}’s usual outings`}>
      {rows.map(row => {
        const dayNames = row.days.length === 7 ? 'Every day' : DAYS.filter(([id]) => row.days.includes(id)).map(([, , full]) => full).join(', ')
        return <li key={`${row.tap_out}-${row.days.join()}`} className="cg-out-row">
          <span className="cg-out-days" role="img" aria-label={dayNames}>
            {DAYS.map(([id, letter]) => <i key={id} className={row.days.includes(id) ? 'is-on' : ''}>{letter}</i>)}
          </span>
          <span className="cg-out-track" aria-hidden="true"><i className="is-dot" /><i className="is-line" /><i className="is-dot" /><i className="is-wait" /><Phone size={14} /></span>
          <dl className="cg-out-times">
            <div><dt>Leaves</dt><dd className="cg-num">{clockAfter(row.tap_out)}</dd></div>
            <div><dt>Usually back</dt><dd className="cg-num">{clockAfter(row.tap_out, row.usual_minutes)}</dd></div>
            <div><dt>Calls by</dt><dd className="cg-num">{clockAfter(row.tap_out, row.limit_minutes[1])}</dd></div>
          </dl>
        </li>
      })}
    </ul>
    <p className="cg-sheet-note cg-rt-foot">Learned from {learned.trained_days} days of {R}’s card taps.</p>
  </>
}
