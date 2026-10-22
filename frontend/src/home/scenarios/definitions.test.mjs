import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_TIMING, scenarioSteps } from './definitions.ts'

test('inactivity demo shows a quiet gap, call, no answer, then caregiver alert', () => {
  const steps = scenarioSteps('unusualInactivity', DEFAULT_TIMING, true)
  assert.deepEqual(steps.map(step => step.kind), [
    'move', 'animate', 'wait', 'quietGap', 'noAnswer', 'alert',
    'wait', 'dispatchResponder', 'responderVisible', 'responderMove', 'responderDoor',
    'responderMove', 'responderDoor', 'responderCheck', 'hold',
  ])
  assert.match(steps[1].label, /no sensor event/i)
  assert.match(steps[3].label, /demo time jump/i)
  assert.match(steps[7].label, /Guard Ali accepts/i)
  assert.equal(steps[11].to, 'responderCheck')
  assert.equal(steps.some(step => step.kind === 'object' && step.object === 'mainDoor'), false)
  assert.match(steps.at(-1).label, /outcome awaits a human report/i)
})

test('false alarm recovers after the quiet gap but before an alert', () => {
  const steps = scenarioSteps('falseAlarmRecovery', DEFAULT_TIMING, true)
  assert.ok(steps.findIndex(step => step.kind === 'quietGap') < steps.findIndex(step => step.kind === 'resolution'))
  assert.equal(steps.some(step => step.kind === 'alert'), false)
  assert.equal(steps.some(step => step.kind === 'noAnswer'), false)
})

test('nap recovery confirms the call without a fall or utility interaction', () => {
  const steps = scenarioSteps('falseAlarmRecovery', DEFAULT_TIMING, true)
  assert.equal(steps[0].to, 'bedside')
  assert.deepEqual(steps.filter(step => step.kind === 'animate').map(step => step.animation), ['rest', 'wake'])
  assert.equal(steps.some(step => step.kind === 'interact'), false)
  assert.ok(steps.findIndex(step => step.kind === 'quietGap') < steps.findIndex(step => step.kind === 'confirmCall'))
  const ringing = steps.findIndex(step => step.kind === 'quietGap')
  assert.equal(steps[ringing + 1].kind, 'wait')
  assert.equal(steps[ringing + 1].seconds, 4)
  assert.equal(steps[ringing + 2].animation, 'wake')
})
