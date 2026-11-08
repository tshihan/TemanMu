import { useState } from 'react'
import { ChevronLeft, ChevronRight, DoorOpen, Droplets } from 'lucide-react'
import type { Unit } from '../api/types'
import type { Ctx } from './copy'
import { OutingsCard, RoutineCard } from './RoutineCard'

type Page = 'menu' | 'water' | 'outings'

/** Settings → "Mum's routine": a menu of what TemanMu has learned, each opening its own page. */
export function RoutineView({ unit, ctx, onBack }: { unit: Unit; ctx: Ctx; onBack: () => void }) {
  const [page, setPage] = useState<Page>('menu')
  const R = ctx.R
  const hasOutings = unit.outing_signal === 'card'
  const title = page === 'water' ? 'Water' : page === 'outings' ? 'Outings' : `${R}’s routine`

  return <div className="cg-sheet cg-routine-view" role="dialog" aria-label={title}>
    <div className="cg-sheet-head">
      <button type="button" className="cg-icon-btn" onClick={page === 'menu' ? onBack : () => setPage('menu')} aria-label="Back"><ChevronLeft size={22} aria-hidden="true" /></button>
      <strong>{title}</strong>
    </div>
    <div className="cg-sheet-body">
      {page === 'menu' && <>
        <p className="cg-sheet-note">What TemanMu has learned is normal for {R}. If today looks different, TemanMu calls {R}.</p>
        <ul className="cg-card cg-menu" aria-label={`${R}’s routine`}>
          <li><button type="button" className="cg-menu-row" onClick={() => setPage('water')}>
            <Droplets size={20} aria-hidden="true" /><span>Water</span><ChevronRight size={18} aria-hidden="true" />
          </button></li>
          {hasOutings && <li><button type="button" className="cg-menu-row" onClick={() => setPage('outings')}>
            <DoorOpen size={20} aria-hidden="true" /><span>Outings</span><ChevronRight size={18} aria-hidden="true" />
          </button></li>}
        </ul>
      </>}
      {page === 'water' && <RoutineCard unit={unit} relationship={R} />}
      {page === 'outings' && <OutingsCard unit={unit} relationship={R} />}
    </div>
  </div>
}
