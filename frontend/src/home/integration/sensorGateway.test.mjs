import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SensorGateway, readingForObject } from './sensorGateway.ts'
import { INITIAL_OBJECT_STATES } from '../interactions/registry.ts'

const unit = (water = 0, power = .15, door = 'closed') => ({
  unit_id: 'A-105', latest: { water_lpm: water, power_kw: power, door },
})

test('serializes state changes and skips duplicate readings', async () => {
  const sent = []
  let current = unit()
  const gateway = new SensorGateway({
    async postReading(reading) {
      sent.push(reading)
      await new Promise(resolve => setTimeout(resolve, 5))
      current = reading.sensor === 'water' ? unit(reading.value, current.latest.power_kw, current.latest.door)
        : unit(current.latest.water_lpm, current.latest.power_kw, reading.value)
      return { accepted: true, unit: current }
    },
  })
  gateway.sync(current)
  await Promise.all([
    gateway.sendSensorReading('water', 6),
    gateway.sendSensorReading('water', 6),
    gateway.sendSensorReading('water', 0),
    gateway.sendSensorReading('door', 'open'),
  ])
  assert.deepEqual(sent.map(({ sensor, value }) => [sensor, value]), [
    ['water', 6], ['water', 0], ['door', 'open'],
  ])
  assert(sent.every(reading => reading.unit_id === 'A-105' && reading.recorded_at === undefined))
})

test('maps each 3D object transition to the documented sensor value', () => {
  const u = { ...unit(), baseline: { standby_power_kw: .15 } }
  const state = INITIAL_OBJECT_STATES
  assert.deepEqual(readingForObject('bathroomTap', true, u, state), { sensor: 'water', value: 6 })
  assert.deepEqual(readingForObject('bathroomTap', false, u, state), { sensor: 'water', value: 0 })
  assert.deepEqual(readingForObject('shower', true, u, state), { sensor: 'water', value: 9 })
  assert.deepEqual(readingForObject('kitchenKettle', true, u, state), { sensor: 'electricity', value: 1.8 })
  assert.deepEqual(readingForObject('kitchenKettle', false, u, state), { sensor: 'electricity', value: .15 })
  assert.deepEqual(readingForObject('television', true, u, state), { sensor: 'electricity', value: .27 })
  assert.deepEqual(readingForObject('bedroomLamp', true, u, state), { sensor: 'electricity', value: .21 })
  assert.deepEqual(readingForObject('mainDoor', true, u, state), { sensor: 'door', value: 'open' })
  assert.deepEqual(readingForObject('mainDoor', false, u, state), { sensor: 'door', value: 'closed' })
})

test('one device turning off keeps other active loads in the household reading', () => {
  const state = { ...INITIAL_OBJECT_STATES, bathroomTap: true, shower: true, kitchenKettle: true, television: true, bedroomLamp: true }
  const u = { ...unit(15, 1.98), baseline: { standby_power_kw: .15 } }
  assert.deepEqual(readingForObject('bathroomTap', false, u, state), { sensor: 'water', value: 9 })
  assert.deepEqual(readingForObject('shower', false, u, state), { sensor: 'water', value: 6 })
  assert.deepEqual(readingForObject('television', false, u, state), { sensor: 'electricity', value: 1.86 })
  assert.deepEqual(readingForObject('bedroomLamp', false, u, state), { sensor: 'electricity', value: 1.92 })
})

test('a failed request is visible and is not replayed', async () => {
  const sent = []
  const gateway = new SensorGateway({ async postReading(reading) {
    sent.push(reading)
    if (sent.length === 1) throw new Error('offline')
    return { accepted: true, unit: unit(reading.value) }
  } })
  gateway.sync(unit())
  await assert.rejects(gateway.sendSensorReading('water', 6), /offline/)
  await gateway.sendSensorReading('water', 6)
  assert.equal(sent.length, 2)
})

test('rejects invalid readings and cancels queued work before reset', async () => {
  let release
  const sent = []
  const gateway = new SensorGateway({ async postReading(reading) {
    sent.push(reading)
    if (sent.length === 1) await new Promise(resolve => { release = resolve })
    return { accepted: true, unit: unit(reading.value) }
  } })
  gateway.sync(unit())
  assert.throws(() => gateway.sendSensorReading('water', -1))
  assert.throws(() => gateway.sendSensorReading('door', 'away'))
  const first = gateway.sendSensorReading('water', 6)
  const second = gateway.sendSensorReading('water', 0)
  await new Promise(resolve => setTimeout(resolve, 0))
  gateway.cancelQueued()
  release()
  await assert.rejects(first, { name: 'AbortError' })
  await assert.rejects(second, { name: 'AbortError' })
  assert.equal(sent.length, 1)
})
