import { useAppState } from '../api/store'
import { statusLabels } from './labels'
import { UnitDetailSections } from './UnitDetail'

/** What the township operator sees for the simulated home while the 3D demo plays beside it. */
export function LiveTownshipPanel({ unitId }: { unitId: string }) {
  const { loaded, units } = useAppState()
  const unit = units.find(item => item.unit_id === unitId)

  return <aside className="live-township" aria-label="Township operator view">
    <div className="live-card live-unit-card">
      <p className="live-card-kicker">Township view · live</p>
      {!loaded || !unit ? <p className="live-muted" role="status">Waiting for the first snapshot…</p> : <>
        <div className="live-unit-head">
          <div>
            <h2>{unit.resident_name}</h2>
            <p>Floor 1 · Unit {unit.unit_id}</p>
          </div>
          <span className={`status-pill status-${unit.status}`}>{statusLabels[unit.status]}</span>
        </div>
        <div className="live-chips">
          <span>Lives alone</span>
          <span>Caregiver · {unit.caregiver_name}</span>
          <span>3 utility sensors</span>
        </div>
      </>}
    </div>

    {unit && <div className="live-township-detail"><UnitDetailSections key={unit.unit_id} unit={unit} /></div>}
  </aside>
}
