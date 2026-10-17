import * as THREE from 'three'
import { BUILDINGS } from '../data/buildings'
import { footprintSize, OccupancyGrid, Tile } from '../grid'
import { Construction, PlacedBuilding, Rotation } from '../state'

export interface PersonView {
  id: string
  color: string
  isPlayer: boolean
}

export interface TownRendererEvents {
  onSelectBuilding: (buildingId: string | null) => void
  // Placement mode: clicked a valid spot (x/y = top-left tile of the footprint).
  onPlace: (x: number, y: number) => void
  // Placement mode: right-clicked to cancel.
  onCancelPlacement: () => void
}

interface Placement {
  typeId: string
  rotation: Rotation
  ghost: THREE.Group
  anchor: Tile | null
  valid: boolean
}

// Classic isometric angle: the camera looks down at ~35.26 degrees.
const ISO_ELEVATION = Math.atan(1 / Math.SQRT2)
const CAMERA_DISTANCE = 80
// World units visible top-to-bottom at zoom 1.
const VIEW_SIZE = 24
const MIN_ZOOM = 0.6
const MAX_ZOOM = 4
// Higher = snappier easing when rotating the camera.
const ROTATE_EASING = 10
const DRAG_THRESHOLD_PX = 5

const GROUND_COLOR = '#5f9b4f'
const DIRT_COLOR = '#8a5a3b'
const RUIN_COLOR = '#7b7b7b'
const FOUNDATION_COLOR = '#6b4f36'
const FOUNDATION_HEIGHT = 0.12
const CONSTRUCTION_COLOR = '#ffc94d'
const VALID_COLOR = '#4caf50'
const INVALID_COLOR = '#e53935'

const PILL_RADIUS = 0.16
const PILL_LENGTH = 0.3
// Tiles per second.
const WALK_SPEED = 1.6
const WANDER_RADIUS = 6

interface Walker {
  id: string
  group: THREE.Group
  pos: THREE.Vector2
  path: Tile[]
  waitFor: number
}

export class TownRenderer {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera()
  private clock = new THREE.Clock()
  private raycaster = new THREE.Raycaster()
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private resizeObserver: ResizeObserver
  private frameId = 0

  private target = new THREE.Vector3()
  private azimuth = Math.PI / 4
  private azimuthGoal = Math.PI / 4

  private buildingsGroup = new THREE.Group()
  private peopleGroup = new THREE.Group()
  private hoverTile: THREE.Mesh
  private constructionMarker: THREE.LineSegments | null = null
  private selectedId: string | null = null

  private grid: OccupancyGrid | null = null
  private walkers = new Map<string, Walker>()
  private pillGeometry = new THREE.CapsuleGeometry(PILL_RADIUS, PILL_LENGTH, 4, 12)
  private markerGeometry = new THREE.ConeGeometry(0.1, 0.18, 4)

  private pointerDown: { x: number, y: number, dragging: boolean } | null = null
  private lastHoveredTile: Tile | null = null
  private placement: Placement | null = null

  constructor (
    private container: HTMLElement,
    private mapSize: { width: number, height: number },
    private events: TownRendererEvents
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.scene.background = new THREE.Color('#2b2d3a')
    this.scene.add(this.buildingsGroup, this.peopleGroup)
    this.addLights()
    this.addGround()
    this.hoverTile = this.createHoverTile()

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()

    const canvas = this.renderer.domElement
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    canvas.addEventListener('pointerleave', this.handlePointerLeave)
    canvas.addEventListener('wheel', this.handleWheel, { passive: false })
    canvas.addEventListener('contextmenu', this.preventDefault)

    this.loop()
  }

  // ---- Public API --------------------------------------------------------

  rotate (direction: 1 | -1): void {
    this.azimuthGoal += direction * Math.PI / 2
  }

  zoomBy (factor: number): void {
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * factor, MIN_ZOOM, MAX_ZOOM)
    this.camera.updateProjectionMatrix()
  }

  resetView (): void {
    this.target.set(0, 0, 0)
    this.camera.zoom = 1
    this.camera.updateProjectionMatrix()
  }

  setBuildings (buildings: PlacedBuilding[], construction: Construction | null, grid: OccupancyGrid): void {
    this.grid = grid
    this.clearGroup(this.buildingsGroup)
    this.constructionMarker = null

    buildings.forEach(building => {
      const isConstructing = !!construction && construction.buildingId === building.id
      this.buildingsGroup.add(this.createBuilding(building, isConstructing ? construction : null))
    })
    this.applySelection()
    this.updatePlacementGhost()

    // Anyone standing where a building now sits steps off it and re-plans their walk.
    this.walkers.forEach(walker => {
      walker.path = []
      const tile = this.walkerTile(walker)
      if (!grid.isWalkable(tile)) this.placeWalker(walker, this.nearestWalkable(tile))
    })
  }

  setPeople (people: PersonView[]): void {
    const ids = new Set(people.map(person => person.id))
    this.walkers.forEach((walker, id) => {
      if (ids.has(id)) return
      this.disposeObject(walker.group, false)
      this.peopleGroup.remove(walker.group)
      this.walkers.delete(id)
    })

    people.forEach(person => {
      const existing = this.walkers.get(person.id)
      if (existing) {
        this.peopleGroup.remove(existing.group)
        this.disposeObject(existing.group, false)
        existing.group = this.createPill(person)
        this.peopleGroup.add(existing.group)
        this.placeWalker(existing, this.walkerTile(existing))
        return
      }

      const walker: Walker = {
        id: person.id,
        group: this.createPill(person),
        pos: new THREE.Vector2(),
        path: [],
        waitFor: Math.random() * 2
      }
      this.peopleGroup.add(walker.group)
      this.placeWalker(walker, this.randomSpawnTile())
      this.walkers.set(person.id, walker)
    })
  }

  setSelected (buildingId: string | null): void {
    this.selectedId = buildingId
    this.applySelection()
  }

  // Shows a ghost of the building under the cursor; pass null to leave placement mode.
  setPlacement (typeId: string | null, rotation: Rotation = 0): void {
    if (this.placement) {
      this.disposeObject(this.placement.ghost, true)
      this.scene.remove(this.placement.ghost)
      this.placement = null
    }
    if (!typeId) return

    const { w, h } = footprintSize(typeId, rotation)
    const ghost = new THREE.Group()
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.1, 1, h - 0.1),
      new THREE.MeshBasicMaterial({ color: VALID_COLOR, transparent: true, opacity: 0.35, depthWrite: false })
    )
    box.position.y = 0.5
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: VALID_COLOR, transparent: true, opacity: 0.5, depthWrite: false })
    )
    base.rotation.x = -Math.PI / 2
    base.position.y = 0.02
    ghost.add(box, base)
    ghost.visible = false
    this.scene.add(ghost)

    this.placement = { typeId, rotation, ghost, anchor: null, valid: false }
    this.hoverTile.visible = false
    this.updatePlacementGhost()
  }

  dispose (): void {
    cancelAnimationFrame(this.frameId)
    this.resizeObserver.disconnect()
    const canvas = this.renderer.domElement
    canvas.removeEventListener('pointerdown', this.handlePointerDown)
    canvas.removeEventListener('pointermove', this.handlePointerMove)
    canvas.removeEventListener('pointerup', this.handlePointerUp)
    canvas.removeEventListener('pointerleave', this.handlePointerLeave)
    canvas.removeEventListener('wheel', this.handleWheel)
    canvas.removeEventListener('contextmenu', this.preventDefault)

    this.disposeObject(this.scene, true)
    this.pillGeometry.dispose()
    this.markerGeometry.dispose()
    this.renderer.dispose()
    canvas.remove()
  }

  // ---- Scene setup -------------------------------------------------------

  private addLights () {
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#3d4a5c', 1.4))

    const sun = new THREE.DirectionalLight('#fff4e0', 2.2)
    sun.position.set(18, 30, 12)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    const half = Math.max(this.mapSize.width, this.mapSize.height) * 0.75
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 100 })
    sun.shadow.bias = -0.0005
    this.scene.add(sun)
  }

  // A floating slab of land like the concept sketch: grass on top, dirt on the sides.
  private addGround () {
    const { width, height } = this.mapSize
    const thickness = 0.8
    const dirt = new THREE.MeshStandardMaterial({ color: DIRT_COLOR })
    const grass = new THREE.MeshStandardMaterial({ color: GROUND_COLOR })
    // BoxGeometry face order: +x, -x, +y (top), -y, +z, -z
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(width, thickness, height),
      [dirt, dirt, grass, dirt, dirt, dirt]
    )
    slab.position.y = -thickness / 2
    slab.receiveShadow = true
    this.scene.add(slab)

    const points: THREE.Vector3[] = []
    for (let x = 0; x <= width; x++) {
      points.push(new THREE.Vector3(x - width / 2, 0.005, -height / 2), new THREE.Vector3(x - width / 2, 0.005, height / 2))
    }
    for (let z = 0; z <= height; z++) {
      points.push(new THREE.Vector3(-width / 2, 0.005, z - height / 2), new THREE.Vector3(width / 2, 0.005, z - height / 2))
    }
    const lines = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: '#2f5a27', transparent: true, opacity: 0.35 })
    )
    this.scene.add(lines)
  }

  private createHoverTile (): THREE.Mesh {
    const tile = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false })
    )
    tile.rotation.x = -Math.PI / 2
    tile.position.y = 0.01
    tile.visible = false
    this.scene.add(tile)
    return tile
  }

  // Placeholder cube: taller each level, grey and squat while still in ruins.
  private createBuilding (building: PlacedBuilding, construction: Construction | null): THREE.Group {
    const type = BUILDINGS[building.typeId]
    const { w, h } = type.footprint
    const placed = footprintSize(building.typeId, building.rotation)
    const group = new THREE.Group()
    group.userData.buildingId = building.id

    const center = this.tileToWorld(building.x + placed.w / 2 - 0.5, building.y + placed.h / 2 - 0.5)
    group.position.set(center.x, 0, center.z)
    group.rotation.y = -THREE.MathUtils.degToRad(building.rotation)

    // Level 0 is either a ruin the town started with, or a freshly placed foundation.
    const isRuin = building.level === 0 && !!type.ruinedName
    const isFoundation = building.level === 0 && !type.ruinedName
    const boxHeight = isFoundation ? FOUNDATION_HEIGHT : this.buildingHeight(building.level)
    const color = isRuin ? RUIN_COLOR : isFoundation ? FOUNDATION_COLOR : type.color
    const inset = 0.15
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w - inset, boxHeight, h - inset),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
    )
    body.position.y = boxHeight / 2
    body.castShadow = true
    body.receiveShadow = true
    body.userData.buildingId = building.id
    body.userData.isBody = true
    group.add(body)

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(body.geometry),
      new THREE.LineBasicMaterial({ color: '#ffffff' })
    )
    outline.position.copy(body.position)
    outline.scale.setScalar(1.02)
    outline.visible = false
    outline.userData.isOutline = true
    group.add(outline)

    // Under construction: a pulsing wireframe showing the size it's growing to.
    if (construction) {
      const targetHeight = this.buildingHeight(construction.targetLevel)
      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(w - inset / 2, targetHeight, h - inset / 2)),
        new THREE.LineBasicMaterial({ color: CONSTRUCTION_COLOR, transparent: true })
      )
      frame.position.y = targetHeight / 2
      group.add(frame)
      this.constructionMarker = frame
    }

    return group
  }

  private buildingHeight (level: number): number {
    return level === 0 ? 0.35 : 0.6 + level * 0.5
  }

  private createPill (person: PersonView): THREE.Group {
    const group = new THREE.Group()
    const body = new THREE.Mesh(
      this.pillGeometry,
      new THREE.MeshStandardMaterial({ color: person.color, roughness: 0.6 })
    )
    body.position.y = PILL_RADIUS + PILL_LENGTH / 2
    body.castShadow = true
    group.add(body)

    // Little floating marker so you can spot yourself in a crowd.
    if (person.isPlayer) {
      const marker = new THREE.Mesh(this.markerGeometry, new THREE.MeshBasicMaterial({ color: '#ffe066' }))
      marker.rotation.x = Math.PI
      marker.position.y = PILL_RADIUS * 2 + PILL_LENGTH + 0.25
      marker.userData.isMarker = true
      group.add(marker)
    }
    return group
  }

  // ---- Loop --------------------------------------------------------------

  private loop = () => {
    this.frameId = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.1)
    const time = this.clock.elapsedTime

    this.azimuth += (this.azimuthGoal - this.azimuth) * (1 - Math.exp(-ROTATE_EASING * dt))
    this.updateCamera()
    this.updateWalkers(dt, time)

    if (this.constructionMarker) {
      (this.constructionMarker.material as THREE.LineBasicMaterial).opacity = 0.55 + 0.45 * Math.sin(time * 4)
    }

    this.renderer.render(this.scene, this.camera)
  }

  private updateCamera () {
    const horizontal = Math.cos(ISO_ELEVATION) * CAMERA_DISTANCE
    this.camera.position.set(
      this.target.x + Math.sin(this.azimuth) * horizontal,
      this.target.y + Math.sin(ISO_ELEVATION) * CAMERA_DISTANCE,
      this.target.z + Math.cos(this.azimuth) * horizontal
    )
    this.camera.lookAt(this.target)
  }

  private updateWalkers (dt: number, time: number) {
    if (!this.grid) return
    const grid = this.grid

    this.walkers.forEach(walker => {
      const body = walker.group.children[0]
      const marker = walker.group.children.find(child => child.userData.isMarker)
      if (marker) marker.position.y = PILL_RADIUS * 2 + PILL_LENGTH + 0.25 + Math.sin(time * 3) * 0.05

      if (!walker.path.length) {
        body.position.y = PILL_RADIUS + PILL_LENGTH / 2
        walker.waitFor -= dt
        if (walker.waitFor <= 0) {
          walker.path = this.pickWanderPath(walker, grid)
          walker.waitFor = 1 + Math.random() * 4
        }
        return
      }

      const next = walker.path[0]
      const toNext = new THREE.Vector2(next.x - walker.pos.x, next.y - walker.pos.y)
      const step = WALK_SPEED * dt
      if (toNext.length() <= step) {
        walker.pos.set(next.x, next.y)
        walker.path.shift()
      } else {
        walker.pos.add(toNext.normalize().multiplyScalar(step))
        walker.group.rotation.y = Math.atan2(toNext.x, toNext.y)
      }

      const world = this.tileToWorld(walker.pos.x, walker.pos.y)
      walker.group.position.set(world.x, 0, world.z)
      body.position.y = PILL_RADIUS + PILL_LENGTH / 2 + Math.abs(Math.sin(time * 12)) * 0.05
    })
  }

  private pickWanderPath (walker: Walker, grid: OccupancyGrid): Tile[] {
    const from = this.walkerTile(walker)
    for (let attempt = 0; attempt < 10; attempt++) {
      const to = {
        x: from.x + Math.round((Math.random() * 2 - 1) * WANDER_RADIUS),
        y: from.y + Math.round((Math.random() * 2 - 1) * WANDER_RADIUS)
      }
      if (to.x === from.x && to.y === from.y) continue
      const path = grid.findPath(from, to)
      if (path) return path
    }
    return []
  }

  // ---- Walker placement --------------------------------------------------

  private walkerTile (walker: Walker): Tile {
    return { x: Math.round(walker.pos.x), y: Math.round(walker.pos.y) }
  }

  private placeWalker (walker: Walker, tile: Tile) {
    walker.pos.set(tile.x, tile.y)
    const world = this.tileToWorld(tile.x, tile.y)
    walker.group.position.set(world.x, 0, world.z)
  }

  private randomSpawnTile (): Tile {
    const center = { x: Math.floor(this.mapSize.width / 2), y: Math.floor(this.mapSize.height / 2) }
    if (!this.grid) return center
    const nearby = this.grid.walkableTiles().filter(tile =>
      Math.abs(tile.x - center.x) <= 4 && Math.abs(tile.y - center.y) <= 4
    )
    return nearby.length ? nearby[Math.floor(Math.random() * nearby.length)] : this.nearestWalkable(center)
  }

  private nearestWalkable (tile: Tile): Tile {
    if (!this.grid) return tile
    let best = tile
    let bestDistance = Infinity
    this.grid.walkableTiles().forEach(candidate => {
      const distance = Math.abs(candidate.x - tile.x) + Math.abs(candidate.y - tile.y)
      if (distance < bestDistance) {
        best = candidate
        bestDistance = distance
      }
    })
    return best
  }

  // ---- Input -------------------------------------------------------------

  private handlePointerDown = (event: PointerEvent) => {
    this.pointerDown = { x: event.clientX, y: event.clientY, dragging: false }
    this.renderer.domElement.setPointerCapture(event.pointerId)
  }

  private handlePointerMove = (event: PointerEvent) => {
    const down = this.pointerDown
    if (down) {
      const dx = event.clientX - down.x
      const dy = event.clientY - down.y
      if (!down.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) down.dragging = true
      if (down.dragging) {
        this.pan(dx, dy)
        down.x = event.clientX
        down.y = event.clientY
        this.hoverTile.visible = false
        return
      }
    }
    this.updateHover(event)
  }

  private handlePointerUp = (event: PointerEvent) => {
    const down = this.pointerDown
    this.pointerDown = null
    if (!down || down.dragging) return

    if (this.placement) {
      if (event.button === 2) this.events.onCancelPlacement()
      if (event.button === 0 && this.placement.valid && this.placement.anchor) {
        this.events.onPlace(this.placement.anchor.x, this.placement.anchor.y)
      }
      return
    }

    if (event.button !== 0) return
    const buildingId = this.pickBuilding(event)
    this.events.onSelectBuilding(buildingId)
  }

  private handlePointerLeave = () => {
    this.hoverTile.visible = false
    this.lastHoveredTile = null
    this.updatePlacementGhost()
  }

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault()
    this.zoomBy(event.deltaY < 0 ? 1.1 : 1 / 1.1)
  }

  private preventDefault = (event: Event) => event.preventDefault()

  // Drag moves the ground with the cursor, whatever angle the camera is at.
  private pan (dx: number, dy: number) {
    const unitsPerPixel = (this.camera.top - this.camera.bottom) / this.camera.zoom / this.container.clientHeight
    const right = new THREE.Vector3(Math.cos(this.azimuth), 0, -Math.sin(this.azimuth))
    const forward = new THREE.Vector3(-Math.sin(this.azimuth), 0, -Math.cos(this.azimuth))
    this.target.addScaledVector(right, -dx * unitsPerPixel)
    this.target.addScaledVector(forward, dy * unitsPerPixel / Math.sin(ISO_ELEVATION))
    this.target.x = THREE.MathUtils.clamp(this.target.x, -this.mapSize.width / 2, this.mapSize.width / 2)
    this.target.z = THREE.MathUtils.clamp(this.target.z, -this.mapSize.height / 2, this.mapSize.height / 2)
  }

  private updateHover (event: PointerEvent) {
    if (this.placement) {
      this.renderer.domElement.style.cursor = ''
      this.lastHoveredTile = this.pickTile(event)
      this.updatePlacementGhost()
      return
    }

    const overBuilding = this.pickBuilding(event) !== null
    this.renderer.domElement.style.cursor = overBuilding ? 'pointer' : ''
    const tile = overBuilding ? null : this.pickTile(event)
    this.hoverTile.visible = !!tile
    if (tile) {
      const world = this.tileToWorld(tile.x, tile.y)
      this.hoverTile.position.set(world.x, 0.01, world.z)
    }
  }

  // Centres the ghost's footprint on the hovered tile and colours it by whether it fits.
  private updatePlacementGhost () {
    const placement = this.placement
    if (!placement) return
    const tile = this.lastHoveredTile
    if (!tile || !this.grid) {
      placement.ghost.visible = false
      placement.anchor = null
      placement.valid = false
      return
    }

    const { w, h } = footprintSize(placement.typeId, placement.rotation)
    const anchor = { x: tile.x - Math.floor((w - 1) / 2), y: tile.y - Math.floor((h - 1) / 2) }
    placement.anchor = anchor
    placement.valid = this.grid.canPlace(placement.typeId, anchor.x, anchor.y, placement.rotation)

    const center = this.tileToWorld(anchor.x + w / 2 - 0.5, anchor.y + h / 2 - 0.5)
    placement.ghost.position.set(center.x, 0, center.z)
    placement.ghost.visible = true
    const color = placement.valid ? VALID_COLOR : INVALID_COLOR
    placement.ghost.children.forEach(child => {
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(color)
    })
  }

  private setRayFromEvent (event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )
    this.raycaster.setFromCamera(ndc, this.camera)
  }

  private pickBuilding (event: PointerEvent): string | null {
    this.setRayFromEvent(event)
    const bodies = this.buildingsGroup.children.flatMap(group => group.children.filter(child => child.userData.isBody))
    const hit = this.raycaster.intersectObjects(bodies, false)[0]
    return hit ? hit.object.userData.buildingId : null
  }

  private pickTile (event: PointerEvent): Tile | null {
    this.setRayFromEvent(event)
    const point = new THREE.Vector3()
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, point)) return null
    const tile = {
      x: Math.floor(point.x + this.mapSize.width / 2),
      y: Math.floor(point.z + this.mapSize.height / 2)
    }
    const inBounds = tile.x >= 0 && tile.y >= 0 && tile.x < this.mapSize.width && tile.y < this.mapSize.height
    return inBounds ? tile : null
  }

  // ---- Helpers -----------------------------------------------------------

  // Tile coordinates (can be fractional) to the world position of that tile's centre.
  private tileToWorld (x: number, y: number): { x: number, z: number } {
    return {
      x: x - this.mapSize.width / 2 + 0.5,
      z: y - this.mapSize.height / 2 + 0.5
    }
  }

  private applySelection () {
    this.buildingsGroup.children.forEach(group => {
      const selected = group.userData.buildingId === this.selectedId
      group.children.forEach(child => {
        if (child.userData.isOutline) child.visible = selected
      })
    })
  }

  private resize () {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (!width || !height) return
    const aspect = width / height
    this.camera.left = -VIEW_SIZE * aspect / 2
    this.camera.right = VIEW_SIZE * aspect / 2
    this.camera.top = VIEW_SIZE / 2
    this.camera.bottom = -VIEW_SIZE / 2
    this.camera.near = 0.1
    this.camera.far = CAMERA_DISTANCE * 3
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private clearGroup (group: THREE.Group) {
    group.children.slice().forEach(child => {
      this.disposeObject(child, true)
      group.remove(child)
    })
  }

  // Frees GPU memory. Shared pill/marker geometries are only freed in dispose().
  private disposeObject (object: THREE.Object3D, includeGeometry: boolean) {
    object.traverse(child => {
      const mesh = child as THREE.Mesh
      if (includeGeometry && mesh.geometry && mesh.geometry !== this.pillGeometry && mesh.geometry !== this.markerGeometry) {
        mesh.geometry.dispose()
      }
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
      materials.forEach(material => material.dispose())
    })
  }
}
