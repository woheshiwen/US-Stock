import type { CSSProperties } from 'react'
import type { EffectRenderProps } from '../types'
import { COLOR_ROLE_CSS } from '../theme/tokens'
import './effects.css'

/**
 * Left/right compare bars — widths driven by clock + CSS transition.
 */
export function CompareBars({ params, clockMs, active }: EffectRenderProps) {
  const title = String(params.title ?? '左右对比')
  const leftLabel = String(params.leftLabel ?? '方案 A')
  const rightLabel = String(params.rightLabel ?? '方案 B')
  const leftValue = Number(params.leftValue ?? 72)
  const rightValue = Number(params.rightValue ?? 45)
  const durationMs = Number(params.durationMs ?? 1400)
  const leftColor = COLOR_ROLE_CSS[String(params.leftColorRole ?? 'data')] ?? COLOR_ROLE_CSS.data
  const rightColor = COLOR_ROLE_CSS[String(params.rightColorRole ?? 'assist')] ?? COLOR_ROLE_CSS.assist

  const t = active ? Math.min(1, clockMs / durationMs) : 0
  const eased = 1 - (1 - t) ** 3
  const max = Math.max(leftValue, rightValue, 1)

  return (
    <div className={`fx-card fx-compare ${active ? 'is-active' : ''}`}>
      <div className="fx-label">{title}</div>
      <div className="fx-compare-row">
        <span className="fx-compare-name">{leftLabel}</span>
        <div className="fx-bar-track">
          <div
            className="fx-bar-fill"
            style={
              {
                width: `${(leftValue / max) * 100 * eased}%`,
                background: leftColor,
              } as CSSProperties
            }
          />
        </div>
        <span className="fx-compare-val" style={{ color: leftColor }}>
          {Math.round(leftValue * eased)}
        </span>
      </div>
      <div className="fx-compare-row">
        <span className="fx-compare-name">{rightLabel}</span>
        <div className="fx-bar-track">
          <div
            className="fx-bar-fill"
            style={
              {
                width: `${(rightValue / max) * 100 * eased}%`,
                background: rightColor,
              } as CSSProperties
            }
          />
        </div>
        <span className="fx-compare-val" style={{ color: rightColor }}>
          {Math.round(rightValue * eased)}
        </span>
      </div>
    </div>
  )
}
