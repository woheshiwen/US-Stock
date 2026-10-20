import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react'
import type { EffectRenderProps } from '../types'
import './PreviewCanvas.css'

interface Props {
  Effect: ComponentType<EffectRenderProps>
  params: EffectRenderProps['params']
  clockMs: number
  active: boolean
  side: 'left' | 'right' | 'either'
}

function PersonPlaceholder() {
  return (
    <div className="person-layer" aria-hidden>
      <div className="safe-zone" />
      <svg className="person-silhouette" viewBox="0 0 200 480" fill="none">
        <ellipse cx="100" cy="58" rx="36" ry="40" fill="var(--person-fill)" />
        <path
          d="M40 140 C40 110, 160 110, 160 140 L175 320 C178 350, 160 360, 150 360 L50 360 C40 360, 22 350, 25 320 Z"
          fill="var(--person-fill)"
        />
        <path
          d="M62 360 L55 470 L85 470 L95 380 L105 470 L135 470 L128 360 Z"
          fill="var(--person-fill)"
        />
      </svg>
      <div className="safe-label">人物安全区 · 动效勿挡</div>
    </div>
  )
}

export function PreviewCanvas({ Effect, params, clockMs, active, side }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const slotSide = side === 'either' ? 'left' : side

  useEffect(() => {
    const el = frameRef.current
    if (!el) return

    const update = () => {
      const w = el.clientWidth
      if (w > 0) setScale(w / 1920)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="preview-stage">
      <div className="preview-frame" ref={frameRef} data-canvas="1920x1080">
        <div
          className="preview-inner"
          style={{ transform: `scale(${scale})` } as CSSProperties}
        >
          <PersonPlaceholder />
          <div className={`effect-slot effect-slot-${slotSide}`}>
            <Effect params={params} clockMs={clockMs} active={active} />
          </div>
          <div className="canvas-meta">1920 × 1080</div>
        </div>
      </div>
    </div>
  )
}
