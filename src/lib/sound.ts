let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  context ??= new Ctor()
  return context
}

/**
 * Plays a short two-note chime with the Web Audio API, so the app needs no
 * bundled audio assets and stays fully offline.
 */
export function playChime(volume: number, kind: 'focus' | 'break' = 'focus'): void {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  const notes = kind === 'focus' ? [660, 880] : [520, 392]
  notes.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    const start = now + index * 0.18
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(Math.min(1, Math.max(0, volume)), start + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.6)
  })
}
