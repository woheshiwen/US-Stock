/** CSS variable tokens — Step 1 will expand skins/styles; placeholders for now */
export const THEME_VARS = {
  dark: {
    '--bg-canvas': '#0a0a0b',
    '--bg-panel': '#121214',
    '--bg-elevated': '#1a1a1e',
    '--border': 'rgba(255,255,255,0.08)',
    '--text': '#f5f5f7',
    '--text-muted': 'rgba(245,245,247,0.55)',
    '--accent': '#a8b0bd',
    '--data': '#7a9ec2',
    '--assist': '#9a8f7a',
    '--warn': '#c4a070',
    '--card-bg': 'rgba(255,255,255,0.06)',
    '--card-border': 'rgba(255,255,255,0.12)',
    '--shadow': '0 12px 40px rgba(0,0,0,0.45)',
    '--safe-line': 'rgba(255,255,255,0.18)',
    '--person-fill': 'rgba(255,255,255,0.08)',
  },
  light: {
    '--bg-canvas': '#f2f0eb',
    '--bg-panel': '#faf9f7',
    '--bg-elevated': '#ffffff',
    '--border': 'rgba(0,0,0,0.08)',
    '--text': '#1d1d1f',
    '--text-muted': 'rgba(29,29,31,0.55)',
    '--accent': '#5c6570',
    '--data': '#3d6b94',
    '--assist': '#6b5f4a',
    '--warn': '#8a6a3c',
    '--card-bg': 'rgba(255,255,255,0.72)',
    '--card-border': 'rgba(0,0,0,0.08)',
    '--shadow': '0 16px 48px rgba(0,0,0,0.12)',
    '--safe-line': 'rgba(0,0,0,0.15)',
    '--person-fill': 'rgba(0,0,0,0.06)',
  },
} as const

export type ThemeName = keyof typeof THEME_VARS

export const COLOR_ROLE_CSS: Record<string, string> = {
  text: 'var(--text)',
  muted: 'var(--text-muted)',
  accent: 'var(--accent)',
  data: 'var(--data)',
  assist: 'var(--assist)',
  warn: 'var(--warn)',
}
