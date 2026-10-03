import type { EffectDef } from './types'
import { NumberTicker } from './effects/NumberTicker'
import { CompareBars } from './effects/CompareBars'
import { QuoteReveal } from './effects/QuoteReveal'

/**
 * Effect registry — left list + right param panel are generated from this.
 * Every card exports one EffectDef.
 */
export const registry: EffectDef[] = [
  {
    id: 'number-ticker',
    name: '核心数字滚动',
    description: '关键指标从 0 缓动到目标值',
    side: 'left',
    component: NumberTicker,
    params: [
      { key: 'label', label: '标签', type: 'string' },
      { key: 'prefix', label: '前缀', type: 'string' },
      { key: 'suffix', label: '后缀', type: 'string' },
      { key: 'target', label: '目标数值', type: 'number', min: 0, max: 9999, step: 1 },
      { key: 'decimals', label: '小数位', type: 'number', min: 0, max: 2, step: 1 },
      { key: 'durationMs', label: '时长 (ms)', type: 'number', min: 400, max: 5000, step: 100 },
      {
        key: 'colorRole',
        label: '颜色角色',
        type: 'colorRole',
        roles: ['text', 'data', 'accent', 'warn'],
      },
    ],
    defaults: {
      label: '核心指标',
      prefix: '',
      suffix: '%',
      target: 86,
      decimals: 0,
      durationMs: 1600,
      colorRole: 'data',
    },
  },
  {
    id: 'compare-bars',
    name: '左右对比条',
    description: '两条横向对比，宽度由时钟驱动',
    side: 'right',
    component: CompareBars,
    params: [
      { key: 'title', label: '标题', type: 'string' },
      { key: 'leftLabel', label: '左标签', type: 'string' },
      { key: 'rightLabel', label: '右标签', type: 'string' },
      { key: 'leftValue', label: '左数值', type: 'number', min: 0, max: 100, step: 1 },
      { key: 'rightValue', label: '右数值', type: 'number', min: 0, max: 100, step: 1 },
      { key: 'durationMs', label: '时长 (ms)', type: 'number', min: 400, max: 5000, step: 100 },
      {
        key: 'leftColorRole',
        label: '左颜色',
        type: 'colorRole',
        roles: ['data', 'accent', 'assist', 'warn'],
      },
      {
        key: 'rightColorRole',
        label: '右颜色',
        type: 'colorRole',
        roles: ['assist', 'data', 'accent', 'muted'],
      },
    ],
    defaults: {
      title: '左右对比',
      leftLabel: '方案 A',
      rightLabel: '方案 B',
      leftValue: 72,
      rightValue: 45,
      durationMs: 1400,
      leftColorRole: 'data',
      rightColorRole: 'assist',
    },
  },
  {
    id: 'quote-reveal',
    name: '金句逐行揭示',
    description: '类名翻转 + CSS 过渡，按时钟逐行出现',
    side: 'left',
    component: QuoteReveal,
    params: [
      { key: 'eyebrow', label: '眉题', type: 'string' },
      { key: 'line1', label: '第 1 行', type: 'string' },
      { key: 'line2', label: '第 2 行', type: 'string' },
      { key: 'line3', label: '第 3 行', type: 'string' },
      { key: 'staggerMs', label: '行间隔 (ms)', type: 'number', min: 100, max: 1200, step: 20 },
      {
        key: 'colorRole',
        label: '颜色角色',
        type: 'colorRole',
        roles: ['text', 'accent', 'data'],
      },
    ],
    defaults: {
      eyebrow: '金句',
      line1: '少即是多，',
      line2: '质感来自留白。',
      line3: '',
      staggerMs: 420,
      colorRole: 'text',
    },
  },
]

export function getEffect(id: string): EffectDef | undefined {
  return registry.find((e) => e.id === id)
}
