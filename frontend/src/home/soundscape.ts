export type HomeCue = 'wake' | 'return' | 'doorOpen' | 'doorClose'
export type HomeLoop = 'telephone' | 'water' | 'kettle' | 'footsteps'

/** Small Web Audio soundscape; no network assets and no audio before a user gesture. */
export class HomeSoundscape {
  private context: AudioContext | null = null
  private enabled = true
  private paused = false
  private active = new Set<HomeLoop>()
  private voices = new Map<HomeLoop, { stop: () => void }>()
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private noise: AudioBuffer | null = null

  unlock() {
    if (!this.enabled) return
    try {
      this.context ??= new AudioContext()
      if (this.context.state === 'suspended') void this.context.resume()
      this.sync()
    } catch { /* Visual demo remains usable without audio. */ }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (enabled && this.context) this.unlock()
    else this.stopVoices()
  }

  setPaused(paused: boolean) {
    this.paused = paused
    if (paused) this.stopVoices()
    else this.sync()
  }

  setLoop(kind: HomeLoop, active: boolean) {
    if (active) this.active.add(kind)
    else this.active.delete(kind)
    this.sync()
  }

  private sync() {
    for (const kind of ['telephone', 'water', 'kettle', 'footsteps'] as HomeLoop[]) {
      if (this.enabled && !this.paused && this.context?.state === 'running' && this.active.has(kind)) {
        if (!this.voices.has(kind)) this.voices.set(kind, this.startLoop(kind))
      } else {
        this.voices.get(kind)?.stop()
        this.voices.delete(kind)
      }
    }
  }

  private tone(frequency: number, length: number, gain: number, type: OscillatorType = 'sine', delay = 0, endFrequency?: number) {
    const ctx = this.context
    if (!ctx || !this.enabled || this.paused) return
    const at = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const volume = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, at)
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, at + length)
    volume.gain.setValueAtTime(.0001, at)
    volume.gain.linearRampToValueAtTime(gain, at + Math.min(.025, length / 3))
    volume.gain.exponentialRampToValueAtTime(.0001, at + length)
    osc.connect(volume).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + length + .02)
  }

  private noiseBuffer() {
    const ctx = this.context!
    if (this.noise) return this.noise
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const samples = buffer.getChannelData(0)
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
    this.noise = buffer
    return buffer
  }

  private startLoop(kind: HomeLoop) {
    const ctx = this.context!
    if (kind === 'footsteps') {
      let left = true
      const step = () => {
        const at = ctx.currentTime
        const source = ctx.createBufferSource()
        source.buffer = this.noiseBuffer()
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = left ? 490 : 430
        const volume = ctx.createGain()
        volume.gain.setValueAtTime(.0001, at)
        volume.gain.exponentialRampToValueAtTime(left ? .065 : .055, at + .012)
        volume.gain.exponentialRampToValueAtTime(.0001, at + .13)
        source.connect(filter).connect(volume).connect(ctx.destination)
        source.start(at)
        source.stop(at + .15)
        this.tone(left ? 88 : 78, .09, .018, 'sine', 0, 55)
        left = !left
      }
      step()
      const timer = setInterval(step, 430)
      return { stop: () => clearInterval(timer) }
    }
    if (kind === 'telephone') {
      let timer: ReturnType<typeof setInterval> | null = null
      const ring = () => {
        this.tone(440, .23, .055, 'sine')
        this.tone(480, .23, .04, 'sine')
        this.tone(440, .23, .055, 'sine', .32)
        this.tone(480, .23, .04, 'sine', .32)
      }
      ring()
      timer = setInterval(ring, 1700)
      return { stop: () => { if (timer) clearInterval(timer) } }
    }
    const source = ctx.createBufferSource()
    source.buffer = this.noiseBuffer()
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = kind === 'water' ? 'bandpass' : 'lowpass'
    filter.frequency.value = kind === 'water' ? 1300 : 620
    filter.Q.value = kind === 'water' ? .7 : .2
    const volume = ctx.createGain()
    volume.gain.setValueAtTime(0, ctx.currentTime)
    volume.gain.linearRampToValueAtTime(kind === 'water' ? .075 : .018, ctx.currentTime + .12)
    source.connect(filter).connect(volume).connect(ctx.destination)
    source.start()
    let hum: OscillatorNode | null = null
    if (kind === 'kettle') {
      hum = ctx.createOscillator()
      hum.type = 'sine'
      hum.frequency.value = 165
      const humGain = ctx.createGain()
      humGain.gain.value = .016
      hum.connect(humGain).connect(ctx.destination)
      hum.start()
      this.tone(880, .1, .035, 'sine')
    }
    return { stop: () => {
      volume.gain.cancelScheduledValues(ctx.currentTime)
      volume.gain.setTargetAtTime(.0001, ctx.currentTime, .04)
      const timer = setTimeout(() => { source.stop(); hum?.stop(); this.timers.delete(timer) }, 250)
      this.timers.add(timer)
    } }
  }

  play(cue: HomeCue) {
    if (!this.enabled || this.paused || !this.context || this.context.state !== 'running') return
    if (cue === 'wake') {
      this.tone(392, .28, .035, 'sine')
      this.tone(523, .38, .04, 'sine', .16)
      this.tone(659, .5, .035, 'sine', .33)
    } else if (cue === 'return') {
      for (let i = 0; i < 4; i++) this.tone(105 + i % 2 * 22, .08, .025, 'triangle', i * .22, 65)
    } else if (cue === 'doorOpen') {
      this.tone(240, .18, .055, 'triangle', 0, 110)
      this.tone(95, .12, .035, 'sine', .12, 65)
    } else {
      this.tone(150, .1, .045, 'triangle', 0, 75)
      this.tone(80, .1, .05, 'sine', .08, 50)
    }
  }

  private stopVoices() {
    for (const voice of this.voices.values()) voice.stop()
    this.voices.clear()
  }

  stopAll() {
    this.active.clear()
    this.stopVoices()
  }

  dispose() {
    this.stopAll()
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
    void this.context?.close()
    this.context = null
  }
}
