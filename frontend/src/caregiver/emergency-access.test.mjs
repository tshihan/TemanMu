import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emergencyAccessFor } from './emergency-access.ts'

const household = { unit_id: 'A-105', resident_name: 'Madam Lee Mei Ling', caregiver_name: 'Sarah Lee' }

test('returns the existing sample agreement only for Madam Lee and Sarah’s household', () => {
  const record = emergencyAccessFor(household)
  assert.ok(record)
  assert.equal(record.unitId, household.unit_id)
  assert.equal(record.residentName, household.resident_name)
  assert.equal(record.caregiverName, household.caregiver_name)
  assert.equal(record.version, 'Demo 1.0')
})

test('does not transfer consent to another unit or a replacement resident or caregiver', () => {
  for (const changed of [
    { unit_id: 'A-104' },
    { resident_name: 'Madam Wong Siew Lan' },
    { caregiver_name: 'Kelvin Wong' },
    { resident_name: '' },
    { caregiver_name: '' },
  ]) assert.equal(emergencyAccessFor({ ...household, ...changed }), null)
})
