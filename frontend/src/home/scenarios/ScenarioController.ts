import type { ScenarioStep } from './definitions'

export type ScenarioActions = {
  moveTo: (to: Extract<ScenarioStep, { kind: 'move' }>['to'], signal: AbortSignal) => Promise<void>
  interactWith: (object: Extract<ScenarioStep, { kind: 'interact' }>['object'], value: boolean, approach: Extract<ScenarioStep, { kind: 'interact' }>['approach'], signal: AbortSignal) => Promise<void>
  playAnimation: (animation: Extract<ScenarioStep, { kind: 'animate' }>['animation'], signal: AbortSignal) => Promise<void>
  setCharacterVisible: (visible: boolean) => void
  setObject: (object: Extract<ScenarioStep, { kind: 'object' }>['object'], value: boolean) => Promise<void>
  waitForQuietGap: (signal: AbortSignal) => Promise<void>
  waitForNoAnswer: (signal: AbortSignal) => Promise<void>
  waitForCaregiverAlert: (signal: AbortSignal) => Promise<void>
  dispatchResponder: (signal: AbortSignal) => Promise<void>
  setResponderVisible: () => void
  setResponderDoor: (open: boolean) => void
  moveResponder: (to: Extract<ScenarioStep, { kind: 'responderMove' }>['to'], signal: AbortSignal) => Promise<void>
  checkResident: () => void
  waitForResolution: (signal: AbortSignal) => Promise<void>
  confirmCall: (signal: AbortSignal) => Promise<void>
  waitForOutcome: (signal: AbortSignal) => Promise<void>
}

export class ScenarioController {
  private aborter = new AbortController()
  private paused = false
  private pauseListeners = new Set<() => void>()
  get signal() { return this.aborter.signal }
  get isPaused() { return this.paused }
  get isStopped() { return this.aborter.signal.aborted }

  pause() { if (!this.isStopped) this.paused = true }
  resume() {
    this.paused = false
    this.pauseListeners.forEach(listener => listener())
    this.pauseListeners.clear()
  }
  stop() { this.aborter.abort(); this.resume() }

  async gate() {
    if (this.isStopped) throw new DOMException('Scenario stopped', 'AbortError')
    if (!this.paused) return
    await new Promise<void>((resolve, reject) => {
      const done = () => { this.signal.removeEventListener('abort', aborted); this.pauseListeners.delete(done); resolve() }
      const aborted = () => { this.pauseListeners.delete(done); reject(new DOMException('Scenario stopped', 'AbortError')) }
      this.pauseListeners.add(done)
      this.signal.addEventListener('abort', aborted, { once: true })
    })
    if (this.isStopped) throw new DOMException('Scenario stopped', 'AbortError')
  }

  /** Animation-frame clock counts only visible, unpaused playback time. */
  wait(seconds: number, signal: AbortSignal = this.signal) {
    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException('Scenario stopped', 'AbortError')); return }
      let elapsed = 0
      let last = performance.now()
      let frame = 0
      const abort = () => { cancelAnimationFrame(frame); signal.removeEventListener('abort', abort); reject(new DOMException('Scenario stopped', 'AbortError')) }
      const tick = (now: number) => {
        if (!this.paused) elapsed += Math.min(now - last, 100)
        last = now
        if (elapsed >= seconds * 1000) { signal.removeEventListener('abort', abort); resolve() }
        else frame = requestAnimationFrame(tick)
      }
      signal.addEventListener('abort', abort, { once: true })
      frame = requestAnimationFrame(tick)
    })
  }

  async play(steps: ScenarioStep[], actions: ScenarioActions, onStep: (index: number, step: ScenarioStep) => void) {
    for (let index = 0; index < steps.length; index++) {
      await this.gate()
      const step = steps[index]
      onStep(index, step)
      switch (step.kind) {
        case 'move': await actions.moveTo(step.to, this.signal); break
        case 'interact': await actions.interactWith(step.object, step.value, step.approach, this.signal); break
        case 'animate': await actions.playAnimation(step.animation, this.signal); break
        case 'wait': await this.wait(step.seconds); break
        case 'visible': actions.setCharacterVisible(step.value); break
        case 'object': await actions.setObject(step.object, step.value); break
        case 'quietGap': await actions.waitForQuietGap(this.signal); break
        case 'noAnswer': await actions.waitForNoAnswer(this.signal); break
        case 'alert': await actions.waitForCaregiverAlert(this.signal); break
        case 'dispatchResponder': await actions.dispatchResponder(this.signal); break
        case 'responderVisible': actions.setResponderVisible(); break
        case 'responderDoor': actions.setResponderDoor(step.open); break
        case 'responderMove': await actions.moveResponder(step.to, this.signal); break
        case 'responderCheck': actions.checkResident(); break
        case 'resolution': await actions.waitForResolution(this.signal); break
        case 'confirmCall': await actions.confirmCall(this.signal); break
        case 'hold': await actions.waitForOutcome(this.signal); break
      }
    }
  }
}
