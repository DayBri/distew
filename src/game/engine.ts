import { BuildingLevel, BUILDINGS, Cost, levelInfo, Production, UnlockId } from './data/buildings'
import { CHARACTER_CLASSES, ModifierId } from './data/characters'
import { ResourceId } from './data/resources'
import { OccupancyGrid } from './grid'
import { uid } from './rng'
import { GameState, PlacedBuilding, Rotation } from './state'

// Production modifiers per building type (e.g. the Farmer's "Green Thumb").
const PRODUCTION_MODIFIERS: Record<string, ModifierId> = {
  farm: 'farmYield'
}

export function getModifier (game: GameState, id: ModifierId): number {
  return CHARACTER_CLASSES[game.player.classId].perks
    .filter(perk => perk.modifier === id)
    .reduce((sum, perk) => sum + perk.value, 0)
}

export function costEntries (cost: Cost): [ResourceId, number][] {
  return Object.entries(cost) as [ResourceId, number][]
}

export function canAfford (game: GameState, cost: Cost): boolean {
  return costEntries(cost).every(([id, amount]) => game.resources[id] >= amount)
}

export function buildingName (building: PlacedBuilding): string {
  const type = BUILDINGS[building.typeId]
  if (building.level === 0) return type.ruinedName || `${type.name} (foundation)`
  const info = levelInfo(building.typeId, building.level)
  return info ? info.name : type.name
}

export function buildDurationMs (game: GameState, buildSeconds: number): number {
  return Math.round(buildSeconds * 1000 / (1 + getModifier(game, 'constructionSpeed')))
}

export function isUnlocked (game: GameState, unlock: UnlockId): boolean {
  return game.buildings.some(building =>
    BUILDINGS[building.typeId].levels
      .slice(0, building.level)
      .some(level => (level.unlocks || []).includes(unlock))
  )
}

// Requirements that aren't met yet, as readable text like "Wooden Town Hall".
export function missingRequirements (game: GameState, level: BuildingLevel): string[] {
  return Object.entries(level.requires || {})
    .filter(([typeId, minLevel]) => !game.buildings.some(b => b.typeId === typeId && b.level >= minLevel))
    .map(([typeId, minLevel]) => {
      const info = levelInfo(typeId, minLevel)
      return info ? info.name : `${BUILDINGS[typeId].name} level ${minLevel}`
    })
}

// Why a building level can't be started right now, or null if it can.
export function constructionBlocker (game: GameState, level: BuildingLevel): string | null {
  if (game.construction) return 'Already building something else'
  const missing = missingRequirements(game, level)
  if (missing.length) return `Needs ${missing.join(', ')}`
  if (!canAfford(game, level.cost)) return 'Not enough materials'
  return null
}

// The town can only ever have one of each building type.
// Why a new building of this type can't be placed right now, or null if it can.
export function placementBlocker (game: GameState, typeId: string): string | null {
  if (game.buildings.some(b => b.typeId === typeId)) return 'Already built – upgrade it instead'
  const firstLevel = levelInfo(typeId, 1)
  if (!firstLevel) return 'Unknown building'
  return constructionBlocker(game, firstLevel)
}

// Only one building can be under construction at a time (until a builder is recruited).
// Returns an error message, or null if construction started.
export function startConstruction (game: GameState, buildingId: string, now: number): string | null {
  const building = game.buildings.find(b => b.id === buildingId)
  if (!building) return 'Building not found'

  const next = levelInfo(building.typeId, building.level + 1)
  if (!next) return 'Already at max level'
  const blocker = constructionBlocker(game, next)
  if (blocker) return blocker

  costEntries(next.cost).forEach(([id, amount]) => { game.resources[id] -= amount })
  game.construction = {
    buildingId,
    targetLevel: building.level + 1,
    startedAt: now,
    finishesAt: now + buildDurationMs(game, next.buildSeconds)
  }
  return null
}

// Places a new building as a foundation on the map and starts building its first level.
export function placeBuilding (
  game: GameState,
  typeId: string,
  x: number,
  y: number,
  rotation: Rotation,
  now: number
): { error: string } | { buildingId: string } {
  const blocker = placementBlocker(game, typeId)
  if (blocker) return { error: blocker }
  if (!new OccupancyGrid(game).canPlace(typeId, x, y, rotation)) return { error: "Can't build there" }

  const building: PlacedBuilding = { id: uid(), typeId, level: 0, x, y, rotation, stored: {} }
  game.buildings.push(building)
  const error = startConstruction(game, building.id, now)
  if (error) {
    game.buildings.pop()
    return { error }
  }
  return { buildingId: building.id }
}

// What a building currently produces per minute, after perks.
export function productionRates (game: GameState, building: PlacedBuilding): Production[] {
  const info = levelInfo(building.typeId, building.level)
  if (!info || !info.produces) return []
  const modifier = PRODUCTION_MODIFIERS[building.typeId]
  const multiplier = 1 + (modifier ? getModifier(game, modifier) : 0)
  return info.produces.map(p => ({ resource: p.resource, perMinute: p.perMinute * multiplier }))
}

export function storageCap (building: PlacedBuilding): number {
  const info = levelInfo(building.typeId, building.level)
  return (info && info.storage) || 0
}

// Moves the whole units stored in a building into the player's resources.
export function collect (game: GameState, buildingId: string): Partial<Record<ResourceId, number>> {
  const building = game.buildings.find(b => b.id === buildingId)
  const collected: Partial<Record<ResourceId, number>> = {}
  if (!building) return collected

  const stored = { ...building.stored }
  ;(Object.keys(stored) as ResourceId[]).forEach(id => {
    const whole = Math.floor(stored[id] || 0)
    if (whole <= 0) return
    game.resources[id] += whole
    stored[id] = (stored[id] || 0) - whole
    collected[id] = whole
  })
  building.stored = stored
  return collected
}

// Advances the game to `now`. Uses timestamps rather than counting ticks, so time spent
// away from the game (closed tab, offline) is caught up the next time this runs.
// Returns the buildings that finished construction.
export function tick (game: GameState, now: number): PlacedBuilding[] {
  const minutes = Math.max(0, now - game.lastTick) / 60000
  game.lastTick = now

  // Produce first, so a building that finishes upgrading this tick doesn't
  // get its new rates applied to the whole time away.
  game.buildings.forEach(building => {
    const rates = productionRates(game, building)
    if (!rates.length) return
    const cap = storageCap(building)
    const stored = { ...building.stored }
    rates.forEach(({ resource, perMinute }) => {
      stored[resource] = Math.min(cap, (stored[resource] || 0) + perMinute * minutes)
    })
    // Replaced rather than mutated so Vue picks up newly added resource keys.
    building.stored = stored
  })

  const finished: PlacedBuilding[] = []
  const construction = game.construction
  if (construction && now >= construction.finishesAt) {
    const building = game.buildings.find(b => b.id === construction.buildingId)
    if (building) {
      building.level = construction.targetLevel
      finished.push(building)
    }
    game.construction = null
  }

  return finished
}
