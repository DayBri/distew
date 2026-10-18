import { emptyResources, ResourceId } from './data/resources'
import { GameState, MAP_SIZE, PlacedBuilding, SAVE_VERSION, startingTownHall } from './state'

const SAVE_KEY = 'distew.save'

export function saveGame (game: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game))
  } catch (ex) {
    console.error('Failed to save game', ex)
  }
}

export function loadGame (): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) return null

  try {
    return migrate(JSON.parse(raw))
  } catch (ex) {
    console.error('Failed to load save, ignoring it', ex)
    return null
  }
}

export function clearSave (): void {
  localStorage.removeItem(SAVE_KEY)
}

// When GameState changes shape, bump SAVE_VERSION and add a step here so old saves still load.
function migrate (save: GameState): GameState | null {
  if (!save || typeof save.version !== 'number' || save.version > SAVE_VERSION) {
    return null
  }

  // v1 -> v2: map grew from 20x20 to 30x30 and construction was added.
  if (save.version < 2) {
    save.map = { width: MAP_SIZE, height: MAP_SIZE }
    save.buildings = [startingTownHall(save.map)]
    save.construction = null
  }

  // v2 -> v3: buildings can produce resources.
  if (save.version < 3) {
    save.lastTick = save.lastSeen
  }

  // v3 -> v4: adventures, inventory, blueprints and equipment.
  if (save.version < 4) {
    save.adventure = null
    save.inventory = []
    save.blueprints = []
    save.stats = { adventuresCompleted: 0 }
    save.player.equipment = { weapon: null, armor: null }
  }

  // Resources added to the game after this save was made start at 0.
  save.resources = { ...emptyResources(), ...save.resources }

  // v4 -> v5: buildings no longer store resources to collect; anything waiting goes straight to the player.
  save.buildings.forEach(building => {
    const legacy = building as PlacedBuilding & { stored?: Partial<Record<ResourceId, number>> }
    Object.entries(legacy.stored || {}).forEach(([id, amount]) => {
      save.resources[id as ResourceId] += Math.floor(amount || 0)
    })
    delete legacy.stored
  })

  fillMissingFields(save)
  save.version = SAVE_VERSION
  return save
}

// Safety net on top of the version steps: any field a save is missing (e.g. a save written
// mid-update by the dev server's hot reload) gets its default instead of crashing the game.
function fillMissingFields (save: GameState) {
  if (typeof save.lastTick !== 'number') save.lastTick = save.lastSeen || Date.now()
  if (save.construction === undefined) save.construction = null
  if (save.adventure === undefined) save.adventure = null
  if (!Array.isArray(save.townsfolk)) save.townsfolk = []
  if (!Array.isArray(save.inventory)) save.inventory = []
  if (!Array.isArray(save.blueprints)) save.blueprints = []
  if (!save.stats) save.stats = { adventuresCompleted: 0 }
  if (!save.player.equipment) save.player.equipment = { weapon: null, armor: null }
  if (!save.carry) save.carry = {}
}
