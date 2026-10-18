import { ResourceId } from './resources'

export type Cost = Partial<Record<ResourceId, number>>

// Features that get switched on by completing a building level.
export type UnlockId = 'shop'

export interface Production {
  resource: ResourceId
  perMinute: number
}

export interface BuildingLevel {
  name: string
  description: string
  cost: Cost
  buildSeconds: number
  // Other buildings needed (at least at this level) before this level can be built, e.g. { town_hall: 1 }.
  requires?: Record<string, number>
  unlocks?: UnlockId[]
  // Resources the player can gather by hand, one per click, from the sidebar.
  gather?: ResourceId[]
  // Resources produced automatically (including while away), straight into the player's materials.
  produces?: Production[]
}

export interface BuildingType {
  id: string
  name: string
  icon: string
  // Placeholder colour for the cube on the town map until there are models.
  color: string
  // Tiles taken up on the town grid (before rotation).
  footprint: { w: number, h: number }
  // Materials that belong to this building. They're listed under it in the sidebar.
  resources?: ResourceId[]
  // Shown at level 0 for buildings the town starts with in ruins. Ruins can't be built from the build menu.
  ruinedName?: string
  // levels[0] is level 1 (wooden), levels[1] is level 2 (stone), ...
  levels: BuildingLevel[]
}

export const BUILDINGS: Record<string, BuildingType> = {
  town_hall: {
    id: 'town_hall',
    name: 'Town Hall',
    icon: 'mdi-home-city',
    color: '#c98a4b',
    footprint: { w: 3, h: 3 },
    ruinedName: 'Ruined Town Hall',
    levels: [
      {
        name: 'Wooden Town Hall',
        description: 'Patch up the old hall so traders will visit. Unlocks the shop.',
        cost: { stick: 25, pebble: 25, berry: 10 },
        buildSeconds: 60,
        unlocks: ['shop']
      }
    ]
  },
  farm: {
    id: 'farm',
    name: 'Farm',
    icon: 'mdi-barley',
    color: '#d9b44a',
    footprint: { w: 2, h: 3 },
    resources: ['wheat', 'carrot', 'potato', 'onion'],
    levels: [
      {
        name: 'Wooden Farm',
        description: 'A small wheat field. Harvest wheat by hand.',
        cost: { stick: 40, pebble: 20 },
        buildSeconds: 45,
        requires: { town_hall: 1 },
        gather: ['wheat']
      },
      {
        name: 'Wooden Farm II',
        description: 'Wheat now grows and harvests itself. Adds carrots, potatoes and onions to harvest by hand.',
        cost: { stick: 60, pebble: 40, wheat: 30 },
        buildSeconds: 90,
        requires: { town_hall: 1 },
        gather: ['wheat', 'carrot', 'potato', 'onion'],
        produces: [{ resource: 'wheat', perMinute: 6 }]
      }
    ]
  },
  mine: {
    id: 'mine',
    name: 'Mine',
    icon: 'mdi-pickaxe',
    color: '#8d8d99',
    footprint: { w: 2, h: 2 },
    resources: ['stone', 'copper'],
    levels: [
      {
        name: 'Wooden Mine',
        description: 'A shallow dig into the hillside. Mine stone by hand.',
        cost: { stick: 50, pebble: 40, wheat: 20 },
        buildSeconds: 60,
        requires: { farm: 1 },
        gather: ['stone']
      },
      {
        name: 'Wooden Mine II',
        description: 'Stone is now mined automatically. Copper can be mined by hand.',
        cost: { stick: 80, stone: 40, wheat: 40 },
        buildSeconds: 120,
        requires: { farm: 1 },
        gather: ['stone', 'copper'],
        produces: [{ resource: 'stone', perMinute: 4 }]
      }
    ]
  }
}

// Building types the player can place from the build menu (not ruins the town starts with).
export const BUILDABLE_TYPES = Object.values(BUILDINGS).filter(type => !type.ruinedName)

// Info for a building at the given level, or undefined for level 0 / beyond max.
export function levelInfo (typeId: string, level: number): BuildingLevel | undefined {
  return BUILDINGS[typeId].levels[level - 1]
}
