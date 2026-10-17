// Rarity odds match the loot crate spinner.
export const RARITIES = {
  common: { name: 'Common', color: '#6abf69', weight: 79.92 },
  uncommon: { name: 'Uncommon', color: '#5c8de0', weight: 15.98 },
  rare: { name: 'Rare', color: '#d36fd0', weight: 3.2 },
  epic: { name: 'Epic', color: '#e05252', weight: 0.64 },
  legendary: { name: 'Legendary', color: '#f2c94c', weight: 0.26 }
} as const

export type RarityId = keyof typeof RARITIES
export const RARITY_IDS = Object.keys(RARITIES) as RarityId[]

export interface Treasure {
  id: string
  name: string
  rarity: RarityId
}

// Collectible treasures found on adventures. Placeholder names until the item list is designed.
export const TREASURES: Treasure[] = [
  { id: 'rusty_spoon', name: 'Rusty Spoon', rarity: 'common' },
  { id: 'old_boot', name: 'Old Boot', rarity: 'common' },
  { id: 'smooth_stone', name: 'Smooth Stone', rarity: 'common' },
  { id: 'bright_feather', name: 'Bright Feather', rarity: 'common' },
  { id: 'silver_ring', name: 'Silver Ring', rarity: 'uncommon' },
  { id: 'carved_flute', name: 'Carved Flute', rarity: 'uncommon' },
  { id: 'jade_figurine', name: 'Jade Figurine', rarity: 'rare' },
  { id: 'ancient_coin', name: 'Ancient Coin', rarity: 'rare' },
  { id: 'dragon_scale', name: 'Dragon Scale', rarity: 'epic' },
  { id: 'wanderers_crown', name: 'Crown of the Wanderer', rarity: 'legendary' }
]

export const TREASURES_BY_ID: Record<string, Treasure> = Object.fromEntries(TREASURES.map(t => [t.id, t]))

export interface Blueprint {
  id: string
  name: string
  description: string
}

// Rare finds that will unlock special buildings, defences and tools.
export const BLUEPRINTS: Blueprint[] = [
  { id: 'stone_walls', name: 'Stone Walls', description: 'Defensive walls to hold off raids.' },
  { id: 'watchtower', name: 'Watchtower', description: 'Spot raiders before they arrive.' },
  { id: 'steel_pickaxe', name: 'Steel Pickaxe', description: 'Forge a pickaxe that can mine rare gems.' },
  { id: 'fishing_hut', name: 'Fishing Hut', description: 'Catch trout, sardines and more.' }
]

export const BLUEPRINTS_BY_ID: Record<string, Blueprint> = Object.fromEntries(BLUEPRINTS.map(b => [b.id, b]))

// Gear the player wears on adventures. Items for these slots come later.
export type EquipmentSlot = 'weapon' | 'armor'

export const EQUIPMENT_SLOTS: Record<EquipmentSlot, { name: string, icon: string }> = {
  weapon: { name: 'Weapon', icon: 'mdi-sword' },
  armor: { name: 'Armor', icon: 'mdi-shield-outline' }
}
