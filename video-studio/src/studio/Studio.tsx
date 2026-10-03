import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { registry, getEffect } from '../registry'
import type { ParamValues, ThemeMode } from '../types'
import { THEME_VARS } from '../theme/tokens'
import { usePlaybackClock } from '../hooks/usePlaybackClock'
import { EffectList } from './EffectList'
import { PreviewCanvas } from './PreviewCanvas'
import { ParamPanel } from './ParamPanel'
import './Studio.css'

export function Studio() {
  const [selectedId, setSelectedId] = useState(registry[0].id)
  const [paramMap, setParamMap] = useState<Record<string, ParamValues>>(() => {
    const init: Record<string, ParamValues> = {}
    for (const fx of registry) init[fx.id] = { ...fx.defaults }
    return init
  })
  const [playing, setPlaying] = useState(true)
  const [active, setActive] = useState(true)
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const { clockMs, reset, setClockMs } = usePlaybackClock(playing)

  const effect = useMemo(() => getEffect(selectedId)!, [selectedId])
  const params = paramMap[selectedId] ?? effect.defaults

  const themeStyle = { ...THEME_VARS[theme] } as CSSProperties

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id)
      reset()
      setClockMs(0)
      setActive(true)
      setPlaying(true)
    },
    [reset, setClockMs],
  )

  const handleChange = (key: string, value: string | number | boolean) => {
    setParamMap((prev) => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], [key]: value },
    }))
  }

  const handleReplay = () => {
    reset()
    setClockMs(0)
    setActive(false)
    // next frame: flip class so CSS transition re-fires
    requestAnimationFrame(() => {
      setActive(true)
      setPlaying(true)
    })
  }

  return (
    <div className="studio" style={themeStyle} data-theme={theme}>
      <EffectList effects={registry} selectedId={selectedId} onSelect={handleSelect} />
      <PreviewCanvas
        Effect={effect.component}
        params={params}
        clockMs={clockMs}
        active={active}
        side={effect.side}
      />
      <ParamPanel
        effect={effect}
        values={params}
        onChange={handleChange}
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
        onReplay={handleReplay}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
    </div>
  )
}
