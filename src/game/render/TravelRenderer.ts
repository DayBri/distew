import * as THREE from 'three'
import { AdventureEventKind } from '../data/adventures'

// Endless walking scene: the character stays still and the world scrolls towards the camera.
// Ground is split into chunks; when one passes behind the camera it's moved to the far end
// with freshly scattered trees and rocks, so the path never ends.

const CHUNK_LENGTH = 20
const CHUNK_COUNT = 4
const CHUNK_WIDTH = 60
const PATH_WIDTH = 1.6
const TREES_PER_CHUNK = 18
const ROCKS_PER_CHUNK = 6
// Units per second.
const WALK_SPEED = 2.4
const ENCOUNTER_SPAWN_Z = -40
const ENCOUNTER_DESPAWN_Z = 8

const SKY_COLOR = '#a8d8e8'
const GRASS_COLOR = '#9cc95a'
const PATH_COLOR = '#e3c99a'
const TRUNK_COLOR = '#7a5236'
const LEAF_COLORS = ['#3f7d4a', '#2f6b45', '#4f8f4f']
const ROCK_COLOR = '#8f8f99'
const BACKPACK_COLOR = '#a0784f'

interface Chunk {
  group: THREE.Group
  decor: THREE.Object3D[]
}

export class TravelRenderer {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120)
  private clock = new THREE.Clock()
  private resizeObserver: ResizeObserver
  private frameId = 0

  private world = new THREE.Group()
  private chunks: Chunk[] = []
  private encounters: THREE.Object3D[] = []
  private character = new THREE.Group()
  private characterBody: THREE.Mesh
  private walking = false

  // Shared geometries/materials so recycling chunks costs nothing.
  private geometries = {
    trunk: new THREE.CylinderGeometry(0.12, 0.18, 1, 6),
    leaves: new THREE.ConeGeometry(0.9, 2.2, 7),
    rock: new THREE.DodecahedronGeometry(0.6, 0),
    pill: new THREE.CapsuleGeometry(0.28, 0.6, 4, 12),
    box: new THREE.BoxGeometry(1, 1, 1)
  }

  private materials = {
    trunk: new THREE.MeshStandardMaterial({ color: TRUNK_COLOR, flatShading: true }),
    leaves: LEAF_COLORS.map(color => new THREE.MeshStandardMaterial({ color, flatShading: true })),
    rock: new THREE.MeshStandardMaterial({ color: ROCK_COLOR, flatShading: true }),
    backpack: new THREE.MeshStandardMaterial({ color: BACKPACK_COLOR, flatShading: true })
  }

  constructor (private container: HTMLElement, characterColor: string) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    container.appendChild(this.renderer.domElement)

    this.scene.background = new THREE.Color(SKY_COLOR)
    this.scene.fog = new THREE.Fog(SKY_COLOR, 18, 55)
    this.scene.add(this.world)

    this.camera.position.set(0, 2.4, 4.2)
    this.camera.lookAt(0, 1, -4)

    this.addLights()
    this.addMountains()
    for (let i = 0; i < CHUNK_COUNT; i++) this.chunks.push(this.createChunk(-i * CHUNK_LENGTH))
    this.characterBody = this.createCharacter(characterColor)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
    this.loop()
  }

  setWalking (walking: boolean): void {
    this.walking = walking
  }

  // Shows something on the roadside ahead that walks/slides past as you travel.
  showEncounter (kind: AdventureEventKind): void {
    const object = this.createEncounter(kind)
    if (!object) return
    object.position.z = ENCOUNTER_SPAWN_Z
    this.world.add(object)
    this.encounters.push(object)
  }

  dispose (): void {
    cancelAnimationFrame(this.frameId)
    this.resizeObserver.disconnect()
    this.scene.traverse(child => {
      const mesh = child as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
      materials.forEach(material => material.dispose())
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  // ---- Scene setup -------------------------------------------------------

  private addLights () {
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#6b8f4e', 1.6))
    const sun = new THREE.DirectionalLight('#fff1d6', 2)
    sun.position.set(-6, 10, 4)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 })
    this.scene.add(sun)
  }

  // Distant peaks that don't scroll, so they feel far away.
  private addMountains () {
    const material = new THREE.MeshStandardMaterial({ color: '#7d9bb3', flatShading: true })
    const peaks = [[-22, 14], [-10, 18], [4, 12], [16, 20], [28, 15]]
    peaks.forEach(([x, height]) => {
      const peak = new THREE.Mesh(new THREE.ConeGeometry(height * 0.8, height, 5), material)
      peak.position.set(x, height / 2 - 1, -70)
      this.scene.add(peak)
    })
  }

  private createChunk (z: number): Chunk {
    const group = new THREE.Group()
    group.position.z = z

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(CHUNK_WIDTH, CHUNK_LENGTH),
      new THREE.MeshStandardMaterial({ color: GRASS_COLOR, flatShading: true })
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    group.add(ground)

    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(PATH_WIDTH, CHUNK_LENGTH),
      new THREE.MeshStandardMaterial({ color: PATH_COLOR })
    )
    path.rotation.x = -Math.PI / 2
    path.position.y = 0.01
    path.receiveShadow = true
    group.add(path)

    const decor: THREE.Object3D[] = []
    for (let i = 0; i < TREES_PER_CHUNK; i++) decor.push(this.createTree())
    for (let i = 0; i < ROCKS_PER_CHUNK; i++) decor.push(this.createRock())
    decor.forEach(object => group.add(object))

    const chunk = { group, decor }
    this.scatter(chunk)
    this.world.add(group)
    return chunk
  }

  private createTree (): THREE.Group {
    const tree = new THREE.Group()
    const trunk = new THREE.Mesh(this.geometries.trunk, this.materials.trunk)
    trunk.position.y = 0.5
    trunk.castShadow = true
    const leaves = new THREE.Mesh(this.geometries.leaves, this.materials.leaves[0])
    leaves.position.y = 2
    leaves.castShadow = true
    tree.add(trunk, leaves)
    return tree
  }

  private createRock (): THREE.Mesh {
    const rock = new THREE.Mesh(this.geometries.rock, this.materials.rock)
    rock.castShadow = true
    rock.userData.isRock = true
    return rock
  }

  // Randomly places a chunk's trees and rocks either side of the path.
  private scatter (chunk: Chunk) {
    chunk.decor.forEach(object => {
      const side = Math.random() < 0.5 ? -1 : 1
      const x = side * (PATH_WIDTH / 2 + 0.8 + Math.random() * (CHUNK_WIDTH / 2 - 2))
      const z = (Math.random() - 0.5) * CHUNK_LENGTH
      object.position.set(x, 0, z)
      object.rotation.y = Math.random() * Math.PI * 2

      if (object.userData.isRock) {
        object.scale.set(0.6 + Math.random(), 0.4 + Math.random() * 0.6, 0.6 + Math.random())
        object.position.y = 0.1
      } else {
        object.scale.setScalar(0.7 + Math.random() * 0.8)
        const leaves = object.children[1] as THREE.Mesh
        leaves.material = this.materials.leaves[Math.floor(Math.random() * this.materials.leaves.length)]
      }
    })
  }

  private createCharacter (color: string): THREE.Mesh {
    const body = new THREE.Mesh(this.geometries.pill, new THREE.MeshStandardMaterial({ color, roughness: 0.6 }))
    body.position.y = 0.58
    body.castShadow = true

    const backpack = new THREE.Mesh(this.geometries.box, this.materials.backpack)
    backpack.scale.set(0.42, 0.5, 0.25)
    backpack.position.set(0, 0.7, 0.3)
    backpack.castShadow = true

    this.character.add(body, backpack)
    this.scene.add(this.character)
    return body
  }

  // Placeholder shapes for things met on the road.
  private createEncounter (kind: AdventureEventKind): THREE.Object3D | null {
    const group = new THREE.Group()
    group.position.x = Math.random() < 0.5 ? -1.6 : 1.6

    if (kind === 'traveller') {
      const hue = Math.floor(Math.random() * 360)
      const body = new THREE.Mesh(this.geometries.pill, new THREE.MeshStandardMaterial({ color: `hsl(${hue}, 55%, 60%)` }))
      body.position.y = 0.58
      body.castShadow = true
      group.add(body)
    } else if (kind === 'danger') {
      const material = new THREE.MeshStandardMaterial({ color: '#5b3a29', flatShading: true })
      const body = new THREE.Mesh(this.geometries.box, material)
      body.scale.set(0.5, 0.45, 1)
      body.position.y = 0.45
      const head = new THREE.Mesh(this.geometries.box, material)
      head.scale.setScalar(0.35)
      head.position.set(0, 0.6, 0.6)
      body.castShadow = head.castShadow = true
      group.add(body, head)
    } else if (kind === 'treasure' || kind === 'blueprint' || kind === 'gold') {
      const chest = new THREE.Mesh(
        this.geometries.box,
        new THREE.MeshStandardMaterial({ color: '#c8963e', emissive: '#6b4a10', flatShading: true })
      )
      chest.scale.set(0.6, 0.4, 0.4)
      chest.position.y = 0.2
      chest.castShadow = true
      group.add(chest)
    } else {
      return null
    }
    return group
  }

  // ---- Loop --------------------------------------------------------------

  private loop = () => {
    this.frameId = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.1)
    const time = this.clock.elapsedTime

    if (this.walking) {
      const distance = WALK_SPEED * dt
      this.chunks.forEach(chunk => {
        chunk.group.position.z += distance
        if (chunk.group.position.z > CHUNK_LENGTH) {
          chunk.group.position.z -= CHUNK_COUNT * CHUNK_LENGTH
          this.scatter(chunk)
        }
      })
      this.encounters = this.encounters.filter(object => {
        object.position.z += distance
        if (object.position.z < ENCOUNTER_DESPAWN_Z) return true
        this.world.remove(object)
        object.traverse(child => {
          const mesh = child as THREE.Mesh
          if (mesh.material) (mesh.material as THREE.Material).dispose()
        })
        return false
      })
      // Bob and sway while walking.
      this.characterBody.position.y = 0.58 + Math.abs(Math.sin(time * 8)) * 0.08
      this.character.rotation.z = Math.sin(time * 8) * 0.04
    } else {
      // Gentle breathing while resting at home.
      this.characterBody.position.y = 0.58
      this.character.rotation.z = 0
      this.characterBody.scale.y = 1 + Math.sin(time * 2) * 0.02
    }

    this.renderer.render(this.scene, this.camera)
  }

  private resize () {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (!width || !height) return
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }
}
