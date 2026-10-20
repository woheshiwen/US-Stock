import { useEffect, useRef, useState } from 'react'

/**
 * Playback clock driven ONLY by requestAnimationFrame.
 * Never use setInterval — virtual-time export (step 5) depends on this.
 */
export function usePlaybackClock(playing: boolean, speed = 1) {
  const [clockMs, setClockMs] = useState(0)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number | null>(null)

  useEffect(() => {
    if (!playing) {
      lastRef.current = null
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const tick = (now: number) => {
      if (lastRef.current == null) lastRef.current = now
      const delta = (now - lastRef.current) * speed
      lastRef.current = now
      setClockMs((prev) => prev + delta)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastRef.current = null
    }
  }, [playing, speed])

  const reset = () => {
    setClockMs(0)
    lastRef.current = null
  }

  return { clockMs, reset, setClockMs }
}

/** Deterministic pseudo-random from index + frame — never Math.random() */
export function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}
