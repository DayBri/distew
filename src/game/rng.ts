export interface WeightedEntry<T> {
  item: T
  weight: number
}

// Weights are relative, so they don't need to add up to 100.
export function weightedPick<T> (entries: WeightedEntry<T>[], random = Math.random): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = random() * total
  for (const entry of entries) {
    roll -= entry.weight
    if (roll < 0) return entry.item
  }
  return entries[entries.length - 1].item
}

export function randomInt (min: number, max: number, random = Math.random): number {
  return min + Math.floor(random() * (max - min + 1))
}

export function randomItem<T> (items: readonly T[], random = Math.random): T {
  return items[Math.floor(random() * items.length)]
}

export function uid (): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
