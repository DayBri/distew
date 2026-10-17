export const TRAITS = [
  'charisma',
  'intelligence',
  'strength',
  'vigilant',
  'agility',
  'creativity',
  'patience',
  'resilience',
  'stamina',
  'luck'
] as const

export type TraitId = typeof TRAITS[number]
export type Traits = Record<TraitId, number>

export const TRAIT_LABELS: Record<TraitId, string> = {
  charisma: 'Charisma',
  intelligence: 'Intelligence',
  strength: 'Strength',
  vigilant: 'Vigilant',
  agility: 'Agility',
  creativity: 'Creativity',
  patience: 'Patience',
  resilience: 'Resilience',
  stamina: 'Stamina',
  luck: 'Luck'
}

// Luck 9 is needed for rare gems in a level 5 mine, so 10 is the cap.
export const TRAIT_MIN = 1
export const TRAIT_MAX = 10
export const TRAIT_BASE = 3

export function baseTraits (value = TRAIT_BASE): Traits {
  const traits = {} as Traits
  TRAITS.forEach(id => { traits[id] = value })
  return traits
}

export function applyTraitBonuses (traits: Traits, bonuses: Partial<Traits>): Traits {
  const result = { ...traits }
  TRAITS.forEach(id => {
    result[id] = clampTrait(result[id] + (bonuses[id] || 0))
  })
  return result
}

export function clampTrait (value: number): number {
  return Math.min(TRAIT_MAX, Math.max(TRAIT_MIN, value))
}
