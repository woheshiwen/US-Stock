import type { EffectDef } from '../types'
import './EffectList.css'

interface Props {
  effects: EffectDef[]
  selectedId: string
  onSelect: (id: string) => void
}

export function EffectList({ effects, selectedId, onSelect }: Props) {
  return (
    <aside className="effect-list">
      <header className="effect-list-header">
        <div className="brand">VIDEO STUDIO</div>
        <div className="sub">动效卡片库 · L1</div>
      </header>
      <ul className="effect-list-items">
        {effects.map((fx) => (
          <li key={fx.id}>
            <button
              type="button"
              className={`effect-item ${selectedId === fx.id ? 'is-selected' : ''}`}
              onClick={() => onSelect(fx.id)}
            >
              <span className="effect-item-name">{fx.name}</span>
              <span className="effect-item-desc">{fx.description}</span>
              <span className="effect-item-meta">{fx.side === 'left' ? '左侧' : fx.side === 'right' ? '右侧' : '两侧'}</span>
            </button>
          </li>
        ))}
      </ul>
      <footer className="effect-list-footer">{effects.length} 张已注册</footer>
    </aside>
  )
}
