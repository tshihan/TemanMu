import type { Api, DoorState, Sensor, Unit } from '../../api/types'
import type { InteractionId } from '../interactions/registry'

export const HOME_UNIT_ID = 'A-105'
export type SensorValue = { water: number; electricity: number; door: DoorState }

export function valuesFromUnit(unit: Unit): SensorValue {
  return { water: unit.latest.water_lpm, electricity: unit.latest.power_kw, door: unit.latest.door }
}

export function readingForObject(object: Exclude<InteractionId, 'telephone'>, on: boolean, unit: Unit): { sensor: Sensor; value: number | DoorState } {
  switch (object) {
    case 'bathroomTap': return { sensor: 'water', value: on ? 6 : 0 }
    case 'kitchenKettle': return { sensor: 'electricity', value: on ? 1.8 : unit.baseline.standby_power_kw }
    case 'mainDoor': return { sensor: 'door', value: on ? 'open' : 'closed' }
  }
}

export function validateReading(sensor: Sensor, value: number | DoorState): void {
  if (sensor !== 'water' && sensor !== 'electricity' && sensor !== 'door') throw new Error('Unknown sensor')
  if (sensor === 'door') {
    if (value !== 'open' && value !== 'closed') throw new Error('Door reading must be open or closed')
  } else if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${sensor} reading must be a non-negative number`)
  }
}

/** One ordered queue for manual and scripted interactions. A failed write is never replayed. */
export class SensorGateway {
  private tail: Promise<unknown> = Promise.resolve()
  private generation = 0
  private values: SensorValue | null = null
  private readonly api: Pick<Api, 'postReading'>
  constructor(api: Pick<Api, 'postReading'>) { this.api = api }

  sync(unit: Unit): void { this.values = valuesFromUnit(unit) }
  cancelQueued(): void { this.generation++ }
  async drain(): Promise<void> { await this.tail }

  sendSensorReading(sensor: Sensor, value: number | DoorState): Promise<Unit | null> {
    validateReading(sensor, value)
    const generation = this.generation
    const job = this.tail.then(async () => {
      if (generation !== this.generation) throw new DOMException('Reading cancelled', 'AbortError')
      if (this.values?.[sensor] === value) return null
      const result = await this.api.postReading({ unit_id: HOME_UNIT_ID, sensor, value })
      if (!result.accepted || result.unit.unit_id !== HOME_UNIT_ID) throw new Error('Backend did not confirm the reading for A-105')
      if (generation !== this.generation) throw new DOMException('Reading cancelled after reset', 'AbortError')
      this.sync(result.unit)
      return result.unit
    })
    this.tail = job.catch(() => undefined)
    return job
  }
}
