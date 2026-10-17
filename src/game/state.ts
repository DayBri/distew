import { AdventureEventKind } from './data/adventures'
import { Appearance } from './data/appearance'
import { EquipmentSlot } from './data/items'
import { BUILDINGS } from './data/buildings'
import { CHARACTER_CLASSES, ClassId } from './data/characters'
import { emptyResources, ResourceId } from './data/resources'
import { applyTraitBonuses, baseTraits, Traits } from './data/traits'
import { uid } from './rng'

export const SAVE_VERSION = 4
export const MAP_SIZE = 30

export type ThemeId = 'regular' | 'jungle' | 'desert'
export type Rotation = 0 | 90 | 180 | 270

// The player and everyone recruited (from adventures or the tavern) share this shape,
// so later they can all walk around the map and be assigned to buildings.
export interface Person {
  id: string
  name: string
  appearance: Appearance
  traits: Traits
  jobId: string | null
  buildingId: string | null
}

export interface Player extends Person {
  classId: ClassId
  // Item ids worn on adventures (none exist yet).
  equipment: Record<EquipmentSlot, string | null>
}

export interface InventoryItem {
  id: string
  treasureId: string
  foundAt: number
}

export interface AdventureLogEntry {
  at: number
  kind: AdventureEventKind | 'home'
  tone: 'good' | 'bad' | 'neutral' | 'rare'
  text: string
}

// Everything picked up on an adventure. It's only added to the town once you're home.
export interface AdventureHaul {
  resources: Partial<Record<ResourceId, number>>
  treasureIds: string[]
  blueprintIds: string[]
  recruits: Person[]
}

export interface Adventure {
  lengthId: string
  startedAt: number
  endsAt: number
  status: 'travelling' | 'home' | 'injured'
  returnedAt: number | null
  eventCount: number
  eventsRolled: number
  // Event index that is always a friendly traveller (the first adventure always finds a recruit).
  guaranteedRecruitAt: number | null
  log: AdventureLogEntry[]
  haul: AdventureHaul
}

// A building placed on the town grid. Level 0 = ruined/unbuilt, level 1 = wooden.
export interface PlacedBuilding {
  id: string
  typeId: string
  level: number
  x: number
  y: number
  rotation: Rotation
  // Produced resources waiting to be collected (fractional while they grow).
  stored: Partial<Record<ResourceId, number>>
}

export interface GameState {
  version: number
  createdAt: number
  lastSeen: number
  // When production was last advanced, so time away is caught up on load.
  lastTick: number
  day: number
  theme: ThemeId
  player: Player
  resources: Record<ResourceId, number>
  townsfolk: Person[]
  map: { width: number, height: number }
  buildings: PlacedBuilding[]
  construction: Construction | null
  // The current adventure, or the last finished one until its summary is dismissed.
  adventure: Adventure | null
  inventory: InventoryItem[]
  blueprints: string[]
  stats: { adventuresCompleted: number }
}

export interface Construction {
  buildingId: string
  targetLevel: number
  startedAt: number
  finishesAt: number
}

export interface NewGameInput {
  classId: ClassId
  name: string
  appearance: Appearance
  bonusTraits: Partial<Traits>
}

export function createNewGame (input: NewGameInput): GameState {
  const characterClass = CHARACTER_CLASSES[input.classId]
  const traits = applyTraitBonuses(
    applyTraitBonuses(baseTraits(), characterClass.traitBonuses),
    input.bonusTraits
  )

  const resources = emptyResources()
  Object.entries(characterClass.startingResources).forEach(([id, amount]) => {
    resources[id as ResourceId] += amount || 0
  })

  const map = { width: MAP_SIZE, height: MAP_SIZE }
  const now = Date.now()

  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastSeen: now,
    lastTick: now,
    day: 1,
    theme: 'regular',
    player: {
      id: uid(),
      name: input.name.trim(),
      classId: input.classId,
      appearance: { ...input.appearance },
      traits,
      jobId: input.classId,
      buildingId: null,
      equipment: { weapon: null, armor: null }
    },
    resources,
    townsfolk: [],
    map,
    buildings: [startingTownHall(map)],
    construction: null,
    adventure: null,
    inventory: [],
    blueprints: [],
    stats: { adventuresCompleted: 0 }
  }
}

// The game starts with a ruined town hall in the middle of the map that the player repairs.
// x/y is the top-left tile of the building's footprint.
export function startingTownHall (map: { width: number, height: number }): PlacedBuilding {
  const { w, h } = BUILDINGS.town_hall.footprint
  return {
    id: uid(),
    typeId: 'town_hall',
    level: 0,
    x: Math.floor((map.width - w) / 2),
    y: Math.floor((map.height - h) / 2),
    rotation: 0,
    stored: {}
  }
}
