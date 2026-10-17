// Placeholder appearance options until real character art exists.
export interface Appearance {
  skinTone: string
  hairColor: string
  hairStyle: HairStyleId
}

export const SKIN_TONES = ['#f5d6b8', '#e8b98f', '#c68b5e', '#9a6340', '#6b4329', '#3f2818']
export const HAIR_COLORS = ['#2b2118', '#5a3a22', '#a5672e', '#d9b25f', '#b3402a', '#d8d8d8']

export const HAIR_STYLES = {
  short: 'Short',
  long: 'Long',
  bun: 'Bun',
  bald: 'Bald'
} as const

export type HairStyleId = keyof typeof HAIR_STYLES

export function defaultAppearance (): Appearance {
  return { skinTone: SKIN_TONES[1], hairColor: HAIR_COLORS[1], hairStyle: 'short' }
}
