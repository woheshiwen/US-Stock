import type { ComponentType } from 'react'

export type ParamType = 'string' | 'number' | 'boolean' | 'select' | 'colorRole'

export type ColorRole = 'text' | 'muted' | 'accent' | 'data' | 'assist' | 'warn'

export interface ParamOption {
  label: string
  value: string
}

export interface ParamField {
  key: string
  label: string
  type: ParamType
  min?: number
  max?: number
  step?: number
  options?: ParamOption[]
  /** semantic color roles only — never free hex */
  roles?: ColorRole[]
}

export type ParamValues = Record<string, string | number | boolean>

export interface EffectRenderProps {
  params: ParamValues
  /** continuous clock in ms, driven by rAF (or virtual time later) */
  clockMs: number
  /** whether the card is in "playing" state for enter animations */
  active: boolean
}

export interface EffectDef {
  id: string
  name: string
  description: string
  /** preferred side so we never cover the person */
  side: 'left' | 'right' | 'either'
  component: ComponentType<EffectRenderProps>
  params: ParamField[]
  defaults: ParamValues
}

export type ThemeMode = 'dark' | 'light'
