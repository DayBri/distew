<template>
  <div class="town-map">
    <div ref="viewport" class="town-map__viewport" />

    <div class="town-map__controls">
      <v-btn small icon title="Rotate left (Q)" @click="rotate(-1)"><v-icon>mdi-rotate-left</v-icon></v-btn>
      <v-btn small icon title="Rotate right (E)" @click="rotate(1)"><v-icon>mdi-rotate-right</v-icon></v-btn>
      <v-btn small icon title="Zoom in" @click="zoom(1.25)"><v-icon>mdi-magnify-plus-outline</v-icon></v-btn>
      <v-btn small icon title="Zoom out" @click="zoom(0.8)"><v-icon>mdi-magnify-minus-outline</v-icon></v-btn>
      <v-btn small icon title="Reset view" @click="resetView"><v-icon>mdi-image-filter-center-focus</v-icon></v-btn>
    </div>

    <div v-if="placingTypeId" class="town-map__banner text-body-2">
      Placing {{ placingName }} · Click to build · R to rotate · Esc / right-click to cancel
    </div>

    <div class="town-map__hint text-caption">
      Drag to pan · Scroll to zoom · Q / E to rotate · Click a building to select it
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { BUILDINGS } from '@/game/data/buildings'
import { CHARACTER_CLASSES } from '@/game/data/characters'
import { OccupancyGrid } from '@/game/grid'
import { PersonView, TownRenderer } from '@/game/render/TownRenderer'
import { Construction, GameState, PlacedBuilding, Rotation } from '@/game/state'
import { store } from '@/game/store'

// Kept outside of `data` so Vue doesn't make the three.js scene reactive.
const renderers = new WeakMap<Vue, TownRenderer>()

export default Vue.extend({
  name: 'TownMap',
  props: {
    selectedBuildingId: { type: String, default: null },
    // Building type being placed from the build menu, or null when not placing.
    placingTypeId: { type: String, default: null }
  },
  data: () => ({
    placementRotation: 0 as Rotation
  }),
  computed: {
    placingName (): string {
      return this.placingTypeId ? BUILDINGS[this.placingTypeId].name : ''
    },
    game (): GameState {
      return store.game as GameState
    },
    // Plain copies, so the renderer never holds on to Vue-reactive objects.
    buildingsSnapshot (): { buildings: PlacedBuilding[], construction: Construction | null } {
      return JSON.parse(JSON.stringify({ buildings: this.game.buildings, construction: this.game.construction }))
    },
    people (): PersonView[] {
      const { player, townsfolk, adventure } = this.game
      // The player isn't in town while they're out on an adventure.
      const away = !!adventure && adventure.status === 'travelling'
      return [
        ...(away ? [] : [{ id: player.id, color: CHARACTER_CLASSES[player.classId].color, isPlayer: true }]),
        ...townsfolk.map(person => ({ id: person.id, color: colorFromId(person.id), isPlayer: false }))
      ]
    },
    peopleKey (): string {
      return this.people.map(person => person.id + person.color).join('|')
    }
  },
  watch: {
    buildingsSnapshot () {
      this.syncBuildings()
    },
    peopleKey () {
      const renderer = renderers.get(this)
      if (renderer) renderer.setPeople(this.people)
    },
    selectedBuildingId (id: string | null) {
      const renderer = renderers.get(this)
      if (renderer) renderer.setSelected(id)
    },
    placingTypeId () {
      this.placementRotation = 0
      this.syncPlacement()
    }
  },
  mounted () {
    const renderer = new TownRenderer(this.$refs.viewport as HTMLElement, this.game.map, {
      onSelectBuilding: id => this.$emit('select-building', id),
      onPlace: (x, y) => this.$emit('place', { x, y, rotation: this.placementRotation }),
      onCancelPlacement: () => this.$emit('cancel-placement')
    })
    renderers.set(this, renderer)
    this.syncBuildings()
    renderer.setPeople(this.people)
    renderer.setSelected(this.selectedBuildingId)
    this.syncPlacement()
    window.addEventListener('keydown', this.handleKeydown)
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.handleKeydown)
    const renderer = renderers.get(this)
    if (renderer) renderer.dispose()
    renderers.delete(this)
  },
  methods: {
    syncBuildings () {
      const renderer = renderers.get(this)
      if (!renderer) return
      const { buildings, construction } = this.buildingsSnapshot
      renderer.setBuildings(buildings, construction, new OccupancyGrid(this.game))
    },
    syncPlacement () {
      const renderer = renderers.get(this)
      if (renderer) renderer.setPlacement(this.placingTypeId, this.placementRotation)
    },
    rotate (direction: 1 | -1) {
      const renderer = renderers.get(this)
      if (renderer) renderer.rotate(direction)
    },
    zoom (factor: number) {
      const renderer = renderers.get(this)
      if (renderer) renderer.zoomBy(factor)
    },
    resetView () {
      const renderer = renderers.get(this)
      if (renderer) renderer.resetView()
    },
    handleKeydown (event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      const key = event.key.toLowerCase()
      if (key === 'q') this.rotate(-1)
      if (key === 'e') this.rotate(1)
      if (this.placingTypeId && key === 'r') {
        this.placementRotation = ((this.placementRotation + 90) % 360) as Rotation
        this.syncPlacement()
      }
      if (this.placingTypeId && key === 'escape') this.$emit('cancel-placement')
    }
  }
})

// Stable placeholder colour per townsperson until they have real models.
function colorFromId (id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return `hsl(${Math.abs(hash) % 360}, 55%, 60%)`
}
</script>

<style scoped>
.town-map {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 4px;
}
.town-map__viewport {
  position: absolute;
  inset: 0;
}
.town-map__controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 4px;
}
.town-map__banner {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  pointer-events: none;
}
.town-map__hint {
  position: absolute;
  left: 8px;
  bottom: 6px;
  opacity: 0.7;
  pointer-events: none;
}
</style>
