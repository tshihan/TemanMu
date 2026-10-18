import { Html } from '@react-three/drei'
import type { Sensor, Unit } from '../api/types'

type V3 = [number, number, number]
export type SensorPulses = Record<Sensor, number>

/** The three utility meters TemanMu actually receives, anchored above the objects that drive them. */
const BEACONS: { sensor: Sensor; label: string; icon: string; at: V3 }[] = [
  { sensor: 'water', label: 'Water meter', icon: '💧', at: [.35, 2.05, -4.02] },
  { sensor: 'electricity', label: 'Power meter', icon: '⚡', at: [5, 2.05, 2.07] },
  { sensor: 'door', label: 'Door sensor', icon: '🚪', at: [1.6, 3.05, 5] },
]

function value(unit: Unit, sensor: Sensor) {
  if (sensor === 'water') return `${unit.latest.water_lpm.toFixed(1)} L/min`
  if (sensor === 'electricity') return `${unit.latest.power_kw.toFixed(2)} kW`
  return unit.latest.door === 'open' ? 'Open' : 'Closed'
}

/** Always shown in sensor view; otherwise each beacon appears briefly when its meter sends a reading. */
export function SensorBeacons({ unit, pulses, sensorView }: { unit: Unit | null; pulses: SensorPulses; sensorView: boolean }) {
  if (!unit) return null
  return <>{BEACONS.map(beacon => {
    const pulse = pulses[beacon.sensor]
    if (!sensorView && !pulse) return null
    return <Html key={`${beacon.sensor}-${pulse}`} position={beacon.at} center style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
      <span className={`sensor-beacon${sensorView ? ' is-persistent' : ''}${pulse ? ' is-pulsing' : ''}`}>
        <span className="sensor-beacon-icon" aria-hidden="true">{beacon.icon}</span>
        <span><small>{beacon.label}</small><b>{value(unit, beacon.sensor)}</b></span>
        {pulse > 0 && <em>sent</em>}
      </span>
    </Html>
  })}</>
}
