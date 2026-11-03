import assert from 'node:assert/strict'
import { test } from 'node:test'
import { latestHospitalTransfer, hospitalGuard, hospitalNote } from './hospital-transfer.ts'

test('uses the latest hospital closure even when a newer non-hospital incident exists', () => {
  const older = { incident_id: 'old', state: 'closed', outcome: 'sent_to_hospital', opened_at: '2026-11-01T00:00:00Z', closed_at: '2026-11-01T01:00:00Z' }
  const latest = { ...older, incident_id: 'latest', closed_at: '2026-11-02T01:00:00Z' }
  const other = { ...latest, incident_id: 'other', outcome: 'resident_ok', closed_at: '2026-11-03T01:00:00Z' }
  assert.equal(latestHospitalTransfer([other, older, latest]), latest)
  assert.equal(latestHospitalTransfer([{ ...latest, state: 'acknowledged' }]), null)
})

test('uses the recorded guard, preferring the closing actor and never substituting the seed guard', () => {
  const incident = { acknowledged_by: { role: 'township', name: 'Guard Bob' }, events: [{ type: 'closed', actor: { role: 'township', name: 'Guard Hana' } }] }
  assert.equal(hospitalGuard(incident), 'Guard Hana')
  assert.equal(hospitalGuard({ ...incident, events: [] }), 'Guard Bob')
  assert.equal(hospitalGuard({ events: [], acknowledged_by: null }), null)
  assert.equal(hospitalGuard(null), null)
})

test('keeps a real guard note but does not treat the default outcome label as a note', () => {
  assert.equal(hospitalNote({ report: '  Daughter accompanied her.  ' }), 'Daughter accompanied her.')
  assert.equal(hospitalNote({ report: 'Sent to hospital' }), null)
  assert.equal(hospitalNote(null), null)
})
