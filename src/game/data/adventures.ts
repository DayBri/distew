import { ResourceId } from './resources'

export interface AdventureLength {
  id: string
  name: string
  description: string
  minutes: number
  // Multiplies the odds of rare events (treasure, gold, blueprints) and, more gently, danger.
  rareBonus: number
}

export const ADVENTURE_LENGTHS: AdventureLength[] = [
  { id: 'stroll', name: 'Short stroll', description: 'A quick look around nearby.', minutes: 5, rareBonus: 1 },
  { id: 'trip', name: 'Day trip', description: 'Further out, with better finds.', minutes: 15, rareBonus: 1.5 },
  { id: 'expedition', name: 'Expedition', description: 'Deep into the wilds. Rare treasures – and dangers.', minutes: 60, rareBonus: 2.5 }
]

// Something happens on the road once a minute.
export const EVENT_INTERVAL_MS = 60 * 1000

export type AdventureEventKind = 'resources' | 'scenery' | 'traveller' | 'danger' | 'treasure' | 'gold' | 'blueprint'

export const EVENT_WEIGHTS: Record<AdventureEventKind, { weight: number, scaling: 'none' | 'rare' | 'danger' }> = {
  resources: { weight: 45, scaling: 'none' },
  scenery: { weight: 15, scaling: 'none' },
  traveller: { weight: 9, scaling: 'none' },
  danger: { weight: 10, scaling: 'danger' },
  treasure: { weight: 12, scaling: 'rare' },
  gold: { weight: 5, scaling: 'rare' },
  blueprint: { weight: 1.5, scaling: 'rare' }
}

export interface ResourceFind {
  resource: ResourceId
  min: number
  max: number
  weight: number
  // {n} is replaced with the amount.
  text: string
}

export const RESOURCE_FINDS: ResourceFind[] = [
  { resource: 'stick', min: 3, max: 8, weight: 25, text: 'Picked up {n} sticks along the path.' },
  { resource: 'pebble', min: 3, max: 8, weight: 20, text: 'Filled your pockets with {n} pebbles from a stream.' },
  { resource: 'berry', min: 3, max: 8, weight: 20, text: 'Found a bush and picked {n} berries.' },
  { resource: 'log', min: 1, max: 4, weight: 15, text: 'Hauled {n} logs from a fallen tree.' },
  { resource: 'sap', min: 1, max: 3, weight: 8, text: 'Collected {n} sap from an old pine.' },
  { resource: 'stone', min: 1, max: 4, weight: 12, text: 'Chipped {n} stone from a rocky outcrop.' }
]

export const SCENERY = [
  'Stopped to admire a waterfall.',
  'Watched a herd of deer cross a meadow.',
  'Walked under a huge stone arch.',
  'Took a nap under a shady tree.',
  'Heard birdsong echo through the valley.',
  'Followed a winding river for a while.'
]

export interface Animal {
  name: string
  power: number
  weight: number
}

export const ANIMALS: Animal[] = [
  { name: 'fox', power: 2, weight: 40 },
  { name: 'wild boar', power: 4, weight: 30 },
  { name: 'wolf', power: 6, weight: 20 },
  { name: 'bear', power: 9, weight: 10 }
]

export const TRAVELLER_NAMES = [
  'Ada', 'Bram', 'Cora', 'Dex', 'Elin', 'Finn', 'Greta', 'Hal', 'Iris', 'Jory',
  'Kit', 'Lena', 'Milo', 'Nell', 'Oren', 'Pia', 'Quin', 'Rosa', 'Sol', 'Tess'
]
