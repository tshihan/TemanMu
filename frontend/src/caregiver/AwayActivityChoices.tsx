import { House, ShieldCheck, UserCheck } from 'lucide-react'
import type { AwayActivityResponse } from '../api/types'
import { GUARD, type Ctx } from './copy'

interface Props { ctx: Ctx; busy: boolean; failed: boolean; onAnswer: (response: AwayActivityResponse) => void }

/** The caregiver's answers to activity at home while the resident is marked away. Only a home check alerts anyone. */
export function AwayActivityChoices({ ctx, busy, failed, onAnswer }: Props) {
  return <div className="cg-away-choices" role="group" aria-label="Do you know who’s there?">
    <button type="button" className="cg-btn cg-btn-outline" onClick={() => onAnswer('resident_returned')} disabled={busy}>
      <House size={18} aria-hidden="true" />{ctx.R} is back home
    </button>
    <button type="button" className="cg-btn cg-btn-outline" onClick={() => onAnswer('known_visitor')} disabled={busy}>
      <UserCheck size={18} aria-hidden="true" />I know who it is
    </button>
    <button type="button" className="cg-btn cg-btn-alarm" onClick={() => onAnswer('home_check_requested')} disabled={busy}>
      <ShieldCheck size={18} aria-hidden="true" />Request a home check
    </button>
    <p className="cg-away-choices-note">Not sure? {GUARD} can go and check the home for you.</p>
    {failed && <p role="alert">Couldn’t record your answer. Please try again.</p>}
  </div>
}
