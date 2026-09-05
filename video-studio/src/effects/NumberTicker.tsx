import type { CSSProperties } from 'react'
import type { ColorRole, EffectRenderProps } from '../types'
import { COLOR_ROLE_CSS } from '../theme/tokens'
import './effects.css'

function roleColor(role: string | number | boolean | undefined): string {
  const key = String(role ?? 'text') as ColorRole
  return COLOR_ROLE_CSS[key] ?? COLOR_ROLE_CSS.text
}

/**
 * Core metric ticker — count-up driven by clockMs, CSS transition for settle.
 * No setInterval / keyframes / Math.random.
 */
export function NumberTicker({ params, clockMs, active }: EffectRenderProps) {
  const label = String(params.label ?? '核心指标')
  const prefix = String(params.prefix ?? '')
  const suffix = String(params.suffix ?? '')
  const target = Number(params.target ?? 86)
  const durationMs = Number(params.durationMs ?? 1600)
  const decimals = Number(params.decimals ?? 0)
  const color = roleColor(params.colorRole)

  const t = active ? Math.min(1, clockMs / durationMs) : 0
  // ease-out cubic, deterministic
  const eased = 1 - (1 - t) ** 3
  const value = target * eased
  const display = value.toFixed(decimals)

  return (
    <div
      className={`fx-card fx-number ${active ? 'is-active' : ''}`}
      style={{ '--fx-color': color } as CSSProperties}
    >
      <div className="fx-label">{label}</div>
      <div className="fx-number-value">
        <span className="fx-prefix">{prefix}</span>
        <span className="fx-digits">{display}</span>
        <span className="fx-suffix">{suffix}</span>
      </div>
      <div className="fx-rule" />
    </div>
  )
}
