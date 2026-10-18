export type ToneKind = 'morning' | 'alert' | 'reminder'

// [frequency Hz, start s, length s, wave, gain]: soft for good news, insistent for alerts.
const SEQUENCES: Record<ToneKind, [number, number, number, OscillatorType, number][]> = {
  morning: [[523, 0, .4, 'sine', .07], [784, .2, .6, 'sine', .06]],
  alert: [[880, 0, .2, 'triangle', .14], [660, .22, .2, 'triangle', .14], [880, .44, .2, 'triangle', .14], [660, .66, .35, 'triangle', .14]],
  reminder: [[740, 0, .14, 'sine', .1], [740, .24, .14, 'sine', .1]],
}

let context: AudioContext | null = null

/** Browsers only allow audio after a user gesture, so call this from one (e.g. the first tap). */
export function unlockAudio(): void {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
  } catch { /* No Web Audio: the app works silently. */ }
}

export function playTone(kind: ToneKind): void {
  try {
    context ??= new AudioContext()
    const ctx = context
    for (const [frequency, start, length, type, gain] of SEQUENCES[kind]) {
      const oscillator = ctx.createOscillator()
      const volume = ctx.createGain()
      const at = ctx.currentTime + start
      oscillator.type = type
      oscillator.frequency.value = frequency
      volume.gain.setValueAtTime(0, at)
      volume.gain.linearRampToValueAtTime(gain, at + .02)
      volume.gain.exponentialRampToValueAtTime(.0001, at + length)
      oscillator.connect(volume).connect(ctx.destination)
      oscillator.start(at)
      oscillator.stop(at + length + .05)
    }
  } catch { /* Sound is optional; everything is also shown on screen. */ }
}
