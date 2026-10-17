import Vue from 'vue'
import * as adventure from './adventure'
import { UnlockId } from './data/buildings'
import { CHARACTER_CLASSES } from './data/characters'
import { FORAGE_TABLE, ResourceId } from './data/resources'
import * as engine from './engine'
import { weightedPick } from './rng'
import { clearSave, loadGame, saveGame } from './save'
import { createNewGame, GameState, NewGameInput, PlacedBuilding, Rotation } from './state'

const state = Vue.observable({
  game: loadGame() as GameState | null,
  // Updated every tick so countdowns and progress bars re-render.
  now: Date.now()
})

export interface TickResult {
  finishedBuildings: PlacedBuilding[]
  adventure: adventure.AdventureUpdate
}

const AUTOSAVE_MS = 5000
let lastSaved = 0

function persist () {
  if (!state.game) return
  state.game.lastSeen = lastSaved = Date.now()
  saveGame(state.game)
}

function addResource (id: ResourceId, amount: number) {
  if (!state.game) return
  Vue.set(state.game.resources, id, (state.game.resources[id] || 0) + amount)
}

export const store = {
  get game (): GameState | null {
    return state.game
  },

  get now (): number {
    return state.now
  },

  get hasGame (): boolean {
    return state.game !== null
  },

  get playerClass () {
    return state.game ? CHARACTER_CLASSES[state.game.player.classId] : null
  },

  isUnlocked (unlock: UnlockId): boolean {
    return state.game ? engine.isUnlocked(state.game, unlock) : false
  },

  startNewGame (input: NewGameInput) {
    state.game = createNewGame(input)
    persist()
  },

  abandonGame () {
    clearSave()
    state.game = null
  },

  forage (): ResourceId | null {
    if (!state.game) return null
    const found = weightedPick(FORAGE_TABLE)
    addResource(found, 1)
    persist()
    return found
  },

  startConstruction (buildingId: string): string | null {
    if (!state.game) return 'No game loaded'
    const error = engine.startConstruction(state.game, buildingId, Date.now())
    if (!error) persist()
    return error
  },

  placeBuilding (typeId: string, x: number, y: number, rotation: Rotation): { error: string } | { buildingId: string } {
    if (!state.game) return { error: 'No game loaded' }
    const result = engine.placeBuilding(state.game, typeId, x, y, rotation, Date.now())
    if ('buildingId' in result) persist()
    return result
  },

  collect (buildingId: string): Partial<Record<ResourceId, number>> {
    if (!state.game) return {}
    const collected = engine.collect(state.game, buildingId)
    persist()
    return collected
  },

  startAdventure (lengthId: string): string | null {
    if (!state.game) return 'No game loaded'
    const error = adventure.startAdventure(state.game, lengthId, Date.now())
    if (!error) persist()
    return error
  },

  dismissAdventure () {
    if (!state.game) return
    adventure.dismissAdventure(state.game)
    persist()
  },

  tick (): TickResult {
    state.now = Date.now()
    if (!state.game) return { finishedBuildings: [], adventure: { newEntries: [], returned: false } }
    const finishedBuildings = engine.tick(state.game, state.now)
    const adventureUpdate = adventure.advanceAdventure(state.game, state.now)
    // Production changes every tick, so save every few seconds rather than every tick.
    const changed = finishedBuildings.length || adventureUpdate.newEntries.length
    if (changed || state.now - lastSaved >= AUTOSAVE_MS) persist()
    return { finishedBuildings, adventure: adventureUpdate }
  },

  persist
}
