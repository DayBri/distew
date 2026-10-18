import { WeightedEntry } from '../rng'

export const RESOURCES = {
  stick: { name: 'Sticks', icon: 'mdi-pine-tree' },
  pebble: { name: 'Pebbles', icon: 'mdi-circle-small' },
  berry: { name: 'Berries', icon: 'mdi-fruit-grapes' },
  log: { name: 'Logs', icon: 'mdi-pine-tree-box' },
  sap: { name: 'Sap', icon: 'mdi-water' },
  stone: { name: 'Stone', icon: 'mdi-cube-outline' },
  copper: { name: 'Copper', icon: 'mdi-gold' },
  iron: { name: 'Iron', icon: 'mdi-anvil' },
  wheat: { name: 'Wheat', icon: 'mdi-barley' },
  carrot: { name: 'Carrots', icon: 'mdi-carrot' },
  potato: { name: 'Potatoes', icon: 'mdi-egg-outline' },
  onion: { name: 'Onions', icon: 'mdi-bullseye' },
  plank: { name: 'Planks', icon: 'mdi-view-sequential' },
  gold: { name: 'Gold', icon: 'mdi-currency-usd' }
} as const

export type ResourceId = keyof typeof RESOURCES

export const RESOURCE_IDS = Object.keys(RESOURCES) as ResourceId[]

export const FORAGE_TABLE: WeightedEntry<ResourceId>[] = [
  { item: 'stick', weight: 30 },
  { item: 'pebble', weight: 35 },
  { item: 'berry', weight: 35 }
]

// The basics found by foraging. Shown under "Materials"; everything else is shown under the building it belongs to.
export const STARTER_RESOURCES: ResourceId[] = FORAGE_TABLE.map(entry => entry.item)

export function emptyResources (): Record<ResourceId, number> {
  const resources = {} as Record<ResourceId, number>
  RESOURCE_IDS.forEach(id => { resources[id] = 0 })
  return resources
}
