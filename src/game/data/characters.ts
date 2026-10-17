import { Traits } from './traits'
import { ResourceId } from './resources'

// Modifiers are summed by the engine later on, e.g. constructionSpeed 0.2 = 20% faster.
export type ModifierId =
  | 'constructionSpeed'
  | 'chopYield'
  | 'raidDefense'
  | 'adventureLoot'
  | 'combatXp'
  | 'farmYield'
  | 'forageYield'
  | 'happiness'

export interface Perk {
  name: string
  description: string
  shape: 'diamond' | 'circle' | 'triangle'
  modifier: ModifierId
  value: number
}

export interface CharacterClass {
  id: ClassId
  name: string
  description: string
  color: string
  icon: string
  traitBonuses: Partial<Traits>
  startingResources: Partial<Record<ResourceId, number>>
  perks: Perk[]
}

export type ClassId = 'builder' | 'warrior' | 'farmer'

export const CHARACTER_CLASSES: Record<ClassId, CharacterClass> = {
  builder: {
    id: 'builder',
    name: 'Builder',
    description: 'Gets the town standing fast. Builds and upgrades sooner and pulls more out of the trees.',
    color: '#8a7560',
    icon: 'mdi-hammer',
    traitBonuses: { strength: 2, stamina: 1, creativity: 1 },
    startingResources: { stick: 10 },
    perks: [
      { name: 'Handy', description: 'Construction is 20% faster', shape: 'diamond', modifier: 'constructionSpeed', value: 0.2 },
      { name: 'Lumber Sense', description: '+25% logs when chopping', shape: 'circle', modifier: 'chopYield', value: 0.25 },
      { name: 'Foreman', description: '+1 town happiness', shape: 'triangle', modifier: 'happiness', value: 1 }
    ]
  },
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    description: 'Keeps the town safe. Holds off raids better and brings home more from adventures.',
    color: '#b05c4a',
    icon: 'mdi-sword',
    traitBonuses: { strength: 1, vigilant: 2, resilience: 1 },
    startingResources: { pebble: 10 },
    perks: [
      { name: 'Guardian', description: 'Raid defense +25%', shape: 'diamond', modifier: 'raidDefense', value: 0.25 },
      { name: 'Plunderer', description: '+10% adventure loot', shape: 'circle', modifier: 'adventureLoot', value: 0.1 },
      { name: 'Veteran', description: '+20% combat XP while idle', shape: 'triangle', modifier: 'combatXp', value: 0.2 }
    ]
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer',
    description: 'Keeps everyone fed and happy. Grows more from the farm and finds more while foraging.',
    color: '#6f9a5c',
    icon: 'mdi-sprout',
    traitBonuses: { patience: 2, stamina: 1, luck: 1 },
    startingResources: { berry: 10 },
    perks: [
      { name: 'Green Thumb', description: 'Farm yield +20%', shape: 'diamond', modifier: 'farmYield', value: 0.2 },
      { name: 'Forager', description: '+15% foraging yield', shape: 'circle', modifier: 'forageYield', value: 0.15 },
      { name: 'Good Neighbour', description: '+2 town happiness', shape: 'triangle', modifier: 'happiness', value: 2 }
    ]
  }
}

export const CLASS_IDS = Object.keys(CHARACTER_CLASSES) as ClassId[]

export const PERK_SHAPE_ICONS: Record<Perk['shape'], { icon: string, color: string }> = {
  diamond: { icon: 'mdi-rhombus', color: '#f4b860' },
  circle: { icon: 'mdi-circle', color: '#e06c6c' },
  triangle: { icon: 'mdi-triangle', color: '#6cb4e0' }
}

// Bonus points the player can spend on top of their class during character design.
export const DESIGN_BONUS_POINTS = 3
