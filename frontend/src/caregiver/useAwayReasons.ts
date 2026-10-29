import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Unit } from '../api/types'

/** Private reasons for the unit's away periods, by period_id (null when none was given).
 *  Unit.away_periods goes to every screen, township included, so it carries no reason;
 *  the caregiver reads them separately. Refetches whenever the set of periods changes. */
export function useAwayReasons(unit: Unit | undefined): Record<string, string | null> {
  const [reasons, setReasons] = useState<Record<string, string | null>>({})
  const unitId = unit?.unit_id
  const key = unit?.away_periods.map(period => period.period_id).join(',') ?? ''

  useEffect(() => {
    if (!unitId || !key) return
    let cancelled = false
    void api.getAwayPeriods(unitId).then(periods => {
      if (!cancelled) setReasons(Object.fromEntries(periods.map(period => [period.period_id, period.reason])))
    }).catch(() => { /* Periods still show, just without their reasons. */ })
    return () => { cancelled = true }
  }, [unitId, key])

  return reasons
}
