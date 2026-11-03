import assert from 'node:assert/strict'
import { test } from 'node:test'
import { completedAt, finishedIncidents, originalTrigger, periodStart, townshipRequestedCount } from './incident-history.ts'

const now = Date.parse('2026-11-03T10:00:00+08:00')
const incident = (id, closed_at, state = 'closed', events = []) => ({
  incident_id: id, unit_id: 'A-105', state, closed_at, opened_at: '2026-09-01T00:00:00Z',
  trigger_reason: null, events,
})

test('calendar windows start at Malaysia midnight, including today and month/year boundaries', () => {
  assert.equal(new Date(periodStart(7, now)).toISOString(), '2026-10-27T16:00:00.000Z')
  assert.equal(new Date(periodStart(30, now)).toISOString(), '2026-10-04T16:00:00.000Z')
  assert.equal(new Date(periodStart(7, Date.parse('2027-01-02T00:01:00+08:00'))).toISOString(), '2026-12-26T16:00:00.000Z')
  assert.equal(new Date(periodStart(7, Date.parse('2026-11-02T16:01:00Z'))).toISOString(), '2026-10-27T16:00:00.000Z')
})

test('filters by completion, includes automatic recovery, excludes ongoing and future records, and sorts newest first', () => {
  const rows = [
    incident('before', '2026-10-27T15:59:59.999Z'),
    incident('boundary', '2026-10-27T16:00:00Z'),
    incident('automatic', '2026-11-03T01:00:00Z', 'auto_resolved'),
    incident('active', '2026-11-03T01:30:00Z', 'acknowledged'),
    incident('future', '2026-11-04T01:00:00Z'),
    incident('current', '2026-11-03T02:00:00Z'),
  ]
  assert.deepEqual(finishedIncidents(rows, 7, now).map(row => row.incident_id), ['current', 'automatic', 'boundary'])
  assert.equal(finishedIncidents(rows, 30, now).length, 4)
})

test('uses recorded completion events when the completion field is absent; undated records appear only in All', () => {
  const fallback = incident('fallback', null, 'auto_resolved', [{ type: 'auto_resolved', at: '2026-11-03T01:00:00Z' }])
  const missing = incident('missing', null)
  assert.equal(completedAt(fallback), '2026-11-03T01:00:00Z')
  assert.deepEqual(finishedIncidents([missing, fallback], 7, now).map(row => row.incident_id), ['fallback'])
  assert.deepEqual(finishedIncidents([missing, fallback], 'all', now).map(row => row.incident_id), ['fallback', 'missing'])
})

test('counts township alert stage once per finished incident, independently of acceptance or reminders', () => {
  const rows = [
    incident('notified', '2026-11-03T01:00:00Z', 'closed', [{ type: 'notified' }, { type: 'notified' }, { type: 'reminder' }]),
    incident('automatic-before-notification', '2026-11-03T01:00:00Z', 'auto_resolved', [{ type: 'detected' }]),
    incident('automatic-after-notification', '2026-11-03T01:00:00Z', 'auto_resolved', [{ type: 'notified' }]),
    incident('request-only', '2026-11-03T01:00:00Z', 'closed', [{ type: 'township_requested' }]),
    incident('active', null, 'notified', [{ type: 'notified' }]),
  ]
  assert.equal(townshipRequestedCount(finishedIncidents(rows, 7, now)), 2)
})

test('shows the original recorded trigger and never substitutes current unit status', () => {
  const row = incident('record', null, 'closed', [{ type: 'detected', detail: 'Original detected event' }])
  assert.equal(originalTrigger({ ...row, trigger_reason: 'Original full explanation' }), 'Original full explanation')
  assert.equal(originalTrigger(row), 'Original detected event')
  assert.equal(originalTrigger(incident('unknown', null)), 'Not recorded')
})
