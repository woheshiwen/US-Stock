import type { EffectDef, ParamField, ParamValues } from '../types'
import './ParamPanel.css'

interface Props {
  effect: EffectDef
  values: ParamValues
  onChange: (key: string, value: string | number | boolean) => void
  playing: boolean
  onTogglePlay: () => void
  onReplay: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

const ROLE_LABELS: Record<string, string> = {
  text: '正文',
  muted: '弱化',
  accent: '强调',
  data: '数据',
  assist: '辅助',
  warn: '特殊',
}

function Field({
  field,
  value,
  onChange,
}: {
  field: ParamField
  value: string | number | boolean
  onChange: (v: string | number | boolean) => void
}) {
  if (field.type === 'string') {
    return (
      <input
        className="param-input"
        type="text"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (field.type === 'number') {
    return (
      <div className="param-number-row">
        <input
          className="param-range"
          type="range"
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
          value={Number(value ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <input
          className="param-input param-input-narrow"
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={Number(value ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    )
  }

  if (field.type === 'boolean') {
    return (
      <label className="param-check">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{Boolean(value) ? '开' : '关'}</span>
      </label>
    )
  }

  if (field.type === 'select' || field.type === 'colorRole') {
    const options =
      field.type === 'colorRole'
        ? (field.roles ?? ['text', 'data', 'accent']).map((r) => ({
            value: r,
            label: ROLE_LABELS[r] ?? r,
          }))
        : (field.options ?? [])

    return (
      <select
        className="param-input"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return null
}

export function ParamPanel({
  effect,
  values,
  onChange,
  playing,
  onTogglePlay,
  onReplay,
  theme,
  onToggleTheme,
}: Props) {
  return (
    <aside className="param-panel">
      <header className="param-panel-header">
        <div className="param-title">{effect.name}</div>
        <div className="param-id">{effect.id}</div>
      </header>

      <div className="param-actions">
        <button type="button" className="btn" onClick={onTogglePlay}>
          {playing ? '暂停' : '播放'}
        </button>
        <button type="button" className="btn" onClick={onReplay}>
          重播
        </button>
        <button type="button" className="btn" onClick={onToggleTheme}>
          {theme === 'dark' ? '亮底' : '暗底'}
        </button>
      </div>

      <div className="param-fields">
        {effect.params.map((field) => (
          <label key={field.key} className="param-field">
            <span className="param-field-label">{field.label}</span>
            <Field
              field={field}
              value={values[field.key]}
              onChange={(v) => onChange(field.key, v)}
            />
          </label>
        ))}
      </div>

      <footer className="param-panel-footer">
        动画仅 CSS transition + rAF · 禁 setInterval
      </footer>
    </aside>
  )
}
