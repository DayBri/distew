import {
  ADVENTURE_LENGTHS,
  AdventureEventKind,
  AdventureLength,
  ANIMALS,
  EVENT_INTERVAL_MS,
  EVENT_WEIGHTS,
  RESOURCE_FINDS,
  SCENERY,
  TRAVELLER_NAMES
} from './data/adventures'
import { HAIR_COLORS, HAIR_STYLES, HairStyleId, SKIN_TONES } from './data/appearance'
import { BLUEPRINTS, RARITIES, RARITY_IDS, TREASURES } from './data/items'
import { RESOURCES, ResourceId } from './data/resources'
import { clampTrait, TRAITS, Traits } from './data/traits'
import { randomInt, randomItem, uid, weightedPick } from './rng'
import { Adventure, AdventureHaul, AdventureLogEntry, GameState, Person } from './state'

export interface AdventureUpdate {
  newEntries: AdventureLogEntry[]
  returned: boolean
}

export function adventureLength (id: string): AdventureLength {
  return ADVENTURE_LENGTHS.find(length => length.id === id) || ADVENTURE_LENGTHS[0]
}

export function isTravelling (game: GameState): boolean {
  return !!game.adventure && game.adventure.status === 'travelling'
}

// Placeholder until weapons and armor have their own stats.
const POWER_PER_EQUIPPED_ITEM = 3

// Bonus from worn weapons and armor.
export function equipmentPower (game: GameState): number {
  return Object.values(game.player.equipment).filter(Boolean).length * POWER_PER_EQUIPPED_ITEM
}

export function combatPower (game: GameState): number {
  const { strength, agility, resilience } = game.player.traits
  return strength + (agility + resilience) / 2 + equipmentPower(game)
}

// Chance (0-1) a traveller agrees to come back to town with you.
export function recruitChance (game: GameState): number {
  return Math.min(0.9, 0.15 + game.player.traits.charisma * 0.05)
}

export function startAdventure (game: GameState, lengthId: string, now: number): string | null {
  if (isTravelling(game)) return 'Already on an adventure'
  const length = ADVENTURE_LENGTHS.find(l => l.id === lengthId)
  if (!length) return 'Unknown adventure'

  const eventCount = Math.round(length.minutes * 60 * 1000 / EVENT_INTERVAL_MS)
  game.adventure = {
    lengthId,
    startedAt: now,
    endsAt: now + eventCount * EVENT_INTERVAL_MS,
    status: 'travelling',
    returnedAt: null,
    eventCount,
    eventsRolled: 0,
    guaranteedRecruitAt: game.stats.adventuresCompleted === 0 ? Math.floor(eventCount / 2) : null,
    log: [],
    haul: { resources: {}, treasureIds: [], blueprintIds: [], recruits: [] }
  }
  return null
}

// Clears a finished adventure's summary so a new one can be chosen.
export function dismissAdventure (game: GameState): void {
  if (game.adventure && !isTravelling(game)) game.adventure = null
}

// Rolls every event that has happened by `now` (all of them at once after time away),
// then brings the player home when the adventure is over or they get hurt.
export function advanceAdventure (game: GameState, now: number): AdventureUpdate {
  const update: AdventureUpdate = { newEntries: [], returned: false }
  const adventure = game.adventure
  if (!adventure || adventure.status !== 'travelling') return update
  const length = adventureLength(adventure.lengthId)

  while (adventure.eventsRolled < adventure.eventCount) {
    const at = adventure.startedAt + (adventure.eventsRolled + 1) * EVENT_INTERVAL_MS
    if (at > now) break
    const index = adventure.eventsRolled
    adventure.eventsRolled++

    const { entry, injured } = rollEvent(game, adventure, length, index, at)
    adventure.log.push(entry)
    update.newEntries.push(entry)

    if (injured) {
      update.newEntries.push(returnHome(game, adventure, at, 'injured'))
      update.returned = true
      return update
    }
  }

  if (now >= adventure.endsAt) {
    update.newEntries.push(returnHome(game, adventure, adventure.endsAt, 'home'))
    update.returned = true
  }
  return update
}

function rollEvent (
  game: GameState,
  adventure: Adventure,
  length: AdventureLength,
  index: number,
  at: number
): { entry: AdventureLogEntry, injured: boolean } {
  if (index === adventure.guaranteedRecruitAt) {
    return { entry: travellerEvent(game, adventure.haul, at, true), injured: false }
  }

  const kind = weightedPick(
    (Object.keys(EVENT_WEIGHTS) as AdventureEventKind[]).map(item => {
      const { weight, scaling } = EVENT_WEIGHTS[item]
      const luck = 1 + game.player.traits.luck * 0.05
      const multiplier = scaling === 'rare' ? length.rareBonus * luck
        : scaling === 'danger' ? 1 + (length.rareBonus - 1) / 2
          : 1
      return { item, weight: weight * multiplier }
    })
  )

  switch (kind) {
    case 'resources': return { entry: resourceEvent(adventure.haul, at), injured: false }
    case 'traveller': return { entry: travellerEvent(game, adventure.haul, at, false), injured: false }
    case 'danger': return dangerEvent(game, adventure.haul, at)
    case 'treasure': return { entry: treasureEvent(game, adventure.haul, length, at), injured: false }
    case 'gold': return { entry: goldEvent(adventure.haul, at, randomInt(1, 3)), injured: false }
    case 'blueprint': return { entry: blueprintEvent(game, adventure.haul, at), injured: false }
    default: return { entry: { at, kind: 'scenery', tone: 'neutral', text: randomItem(SCENERY) }, injured: false }
  }
}

function addToHaul (haul: AdventureHaul, resource: ResourceId, amount: number) {
  haul.resources = { ...haul.resources, [resource]: (haul.resources[resource] || 0) + amount }
}

function resourceEvent (haul: AdventureHaul, at: number): AdventureLogEntry {
  const find = weightedPick(RESOURCE_FINDS.map(item => ({ item, weight: item.weight })))
  const amount = randomInt(find.min, find.max)
  addToHaul(haul, find.resource, amount)
  return { at, kind: 'resources', tone: 'good', text: find.text.replace('{n}', String(amount)) }
}

function goldEvent (haul: AdventureHaul, at: number, amount: number): AdventureLogEntry {
  addToHaul(haul, 'gold', amount)
  return { at, kind: 'gold', tone: 'rare', text: `Found ${amount} ${RESOURCES.gold.name.toLowerCase()} in a forgotten pouch.` }
}

function treasureEvent (game: GameState, haul: AdventureHaul, length: AdventureLength, at: number): AdventureLogEntry {
  // Luck and longer adventures make everything above common more likely.
  const boost = (1 + game.player.traits.luck * 0.05) * length.rareBonus
  const rarity = weightedPick(RARITY_IDS.map(id => ({
    item: id,
    weight: RARITIES[id].weight * (id === 'common' ? 1 : boost)
  })))
  const treasure = randomItem(TREASURES.filter(t => t.rarity === rarity))
  haul.treasureIds.push(treasure.id)
  return {
    at,
    kind: 'treasure',
    tone: rarity === 'common' ? 'good' : 'rare',
    text: `Found ${article(RARITIES[rarity].name)} ${RARITIES[rarity].name.toLowerCase()} treasure: ${treasure.name}!`
  }
}

function blueprintEvent (game: GameState, haul: AdventureHaul, at: number): AdventureLogEntry {
  const unfound = BLUEPRINTS.filter(b => !game.blueprints.includes(b.id) && !haul.blueprintIds.includes(b.id))
  if (!unfound.length) return goldEvent(haul, at, 5)
  const blueprint = randomItem(unfound)
  haul.blueprintIds.push(blueprint.id)
  return { at, kind: 'blueprint', tone: 'rare', text: `Discovered a rare blueprint in some old ruins: ${blueprint.name}!` }
}

function travellerEvent (game: GameState, haul: AdventureHaul, at: number, guaranteed: boolean): AdventureLogEntry {
  const traveller = createTraveller()
  if (guaranteed || Math.random() < recruitChance(game)) {
    haul.recruits.push(traveller)
    return { at, kind: 'traveller', tone: 'rare', text: `Met ${traveller.name}, a wandering traveller. They agreed to come back to your town!` }
  }
  return { at, kind: 'traveller', tone: 'neutral', text: `Shared a campfire with ${traveller.name}, but they weren't ready to settle down.` }
}

function dangerEvent (game: GameState, haul: AdventureHaul, at: number): { entry: AdventureLogEntry, injured: boolean } {
  const animal = weightedPick(ANIMALS.map(item => ({ item, weight: item.weight })))
  const name = `${article(animal.name)} ${animal.name}`

  // Vigilant travellers often spot trouble first and avoid it.
  if (Math.random() < game.player.traits.vigilant * 0.04) {
    return { entry: { at, kind: 'danger', tone: 'neutral', text: `Spotted ${name} before it spotted you, and slipped past.` }, injured: false }
  }

  const playerRoll = combatPower(game) + Math.random() * 6
  const animalRoll = animal.power + Math.random() * 6
  if (playerRoll >= animalRoll) {
    return { entry: { at, kind: 'danger', tone: 'good', text: `Fought off ${name}!` }, injured: false }
  }

  // Losing a fight sends you home early and you drop half of the resources you were carrying.
  const kept: Partial<Record<ResourceId, number>> = {}
  ;(Object.keys(haul.resources) as ResourceId[]).forEach(id => {
    kept[id] = Math.floor((haul.resources[id] || 0) / 2)
  })
  haul.resources = kept
  return {
    entry: { at, kind: 'danger', tone: 'bad', text: `Attacked by ${name}! You fled for home and dropped half your resources.` },
    injured: true
  }
}

function returnHome (game: GameState, adventure: Adventure, at: number, status: 'home' | 'injured'): AdventureLogEntry {
  const { haul } = adventure
  ;(Object.keys(haul.resources) as ResourceId[]).forEach(id => {
    game.resources[id] += haul.resources[id] || 0
  })
  haul.treasureIds.forEach(treasureId => game.inventory.push({ id: uid(), treasureId, foundAt: at }))
  haul.blueprintIds.forEach(id => { if (!game.blueprints.includes(id)) game.blueprints.push(id) })
  haul.recruits.forEach(person => game.townsfolk.push(person))
  game.stats.adventuresCompleted++

  adventure.status = status
  adventure.returnedAt = at
  const entry: AdventureLogEntry = status === 'home'
    ? { at, kind: 'home', tone: 'good', text: 'Made it home safe.' }
    : { at, kind: 'home', tone: 'bad', text: 'Limped home to rest.' }
  adventure.log.push(entry)
  return entry
}

export function createTraveller (): Person {
  const traits = {} as Traits
  TRAITS.forEach(id => { traits[id] = randomInt(1, 6) })
  const strongest = randomItem(TRAITS)
  traits[strongest] = clampTrait(traits[strongest] + 3)

  return {
    id: uid(),
    name: randomItem(TRAVELLER_NAMES),
    appearance: {
      skinTone: randomItem(SKIN_TONES),
      hairColor: randomItem(HAIR_COLORS),
      hairStyle: randomItem(Object.keys(HAIR_STYLES) as HairStyleId[])
    },
    traits,
    jobId: null,
    buildingId: null
  }
}

function article (word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a'
}
