import type { Status } from '../api/types'

export const statusLabels: Record<Status, string> = {
  routine: 'Normal',
  possible_away: 'Possible Away',
  unusual_inactivity: 'Unusual Inactivity',
  unresolved_concern: 'Unresolved Concern',
}
