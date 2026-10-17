import { BUILDINGS } from './data/buildings'
import { GameState, PlacedBuilding, Rotation } from './state'

export interface Tile {
  x: number
  y: number
}

// Rotating a building 90/270 degrees swaps its footprint's width and height.
export function footprintSize (typeId: string, rotation: Rotation): { w: number, h: number } {
  const { w, h } = BUILDINGS[typeId].footprint
  return rotation === 90 || rotation === 270 ? { w: h, h: w } : { w, h }
}

export function buildingTiles (building: PlacedBuilding): Tile[] {
  const { w, h } = footprintSize(building.typeId, building.rotation)
  const tiles: Tile[] = []
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      tiles.push({ x: building.x + dx, y: building.y + dy })
    }
  }
  return tiles
}

// Tile grid of which building (if any) sits on each tile.
export class OccupancyGrid {
  readonly width: number
  readonly height: number
  private cells: (string | null)[]

  constructor (game: GameState) {
    this.width = game.map.width
    this.height = game.map.height
    this.cells = new Array(this.width * this.height).fill(null)
    game.buildings.forEach(building => {
      buildingTiles(building).forEach(tile => {
        if (this.inBounds(tile)) this.cells[this.index(tile)] = building.id
      })
    })
  }

  inBounds (tile: Tile): boolean {
    return tile.x >= 0 && tile.y >= 0 && tile.x < this.width && tile.y < this.height
  }

  buildingAt (tile: Tile): string | null {
    return this.inBounds(tile) ? this.cells[this.index(tile)] : null
  }

  isWalkable (tile: Tile): boolean {
    return this.inBounds(tile) && this.cells[this.index(tile)] === null
  }

  canPlace (typeId: string, x: number, y: number, rotation: Rotation): boolean {
    const { w, h } = footprintSize(typeId, rotation)
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        if (!this.isWalkable({ x: x + dx, y: y + dy })) return false
      }
    }
    return true
  }

  walkableTiles (): Tile[] {
    const tiles: Tile[] = []
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.cells[y * this.width + x] === null) tiles.push({ x, y })
      }
    }
    return tiles
  }

  // Breadth-first search over walkable tiles (4-directional). Returns the tiles to walk
  // through after `from`, ending at `to`, or null if `to` can't be reached.
  // A 30x30 grid is small enough that this is effectively free.
  findPath (from: Tile, to: Tile): Tile[] | null {
    if (!this.isWalkable(to)) return null
    const start = this.index(from)
    const goal = this.index(to)
    const cameFrom = new Map<number, number>([[start, -1]])
    const queue = [start]

    while (queue.length) {
      const current = queue.shift() as number
      if (current === goal) break
      const cx = current % this.width
      const cy = Math.floor(current / this.width)
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        const next = { x: nx, y: ny }
        if (!this.isWalkable(next)) continue
        const nextIndex = this.index(next)
        if (cameFrom.has(nextIndex)) continue
        cameFrom.set(nextIndex, current)
        queue.push(nextIndex)
      }
    }

    if (!cameFrom.has(goal)) return null
    const path: Tile[] = []
    for (let node = goal; node !== start; node = cameFrom.get(node) as number) {
      path.unshift({ x: node % this.width, y: Math.floor(node / this.width) })
    }
    return path
  }

  private index (tile: Tile): number {
    return tile.y * this.width + tile.x
  }
}
