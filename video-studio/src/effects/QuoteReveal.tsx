import type { CSSProperties } from 'react'
import type { EffectRenderProps } from '../types'
import { COLOR_ROLE_CSS } from '../theme/tokens'
import './effects.css'

/**
 * Quote line reveal — lines appear via class toggle + CSS transition,
 * timed by clockMs. Never one-shot @keyframes.
 */
export function QuoteReveal({ params, clockMs, active }: EffectRenderProps) {
  const eyebrow = String(params.eyebrow ?? '金句')
  const line1 = String(params.line1 ?? '少即是多，')
  const line2 = String(params.line2 ?? '质感来自留白。')
  const line3 = String(params.line3 ?? '')
  const staggerMs = Number(params.staggerMs ?? 420)
  const color = COLOR_ROLE_CSS[String(params.colorRole ?? 'text')] ?? COLOR_ROLE_CSS.text

  const lines = [line1, line2, line3].filter((l) => l.trim().length > 0)

  return (
    <div
      className={`fx-card fx-quote ${active ? 'is-active' : ''}`}
      style={{ '--fx-color': color } as CSSProperties}
    >
      <div className="fx-label">{eyebrow}</div>
      <div className="fx-quote-lines">
        {lines.map((line, i) => {
          const visible = active && clockMs >= i * staggerMs
          return (
            <p key={i} className={`fx-quote-line ${visible ? 'is-shown' : ''}`}>
              {line}
            </p>
          )
        })}
      </div>
      <div className="fx-rule" />
    </div>
  )
}
