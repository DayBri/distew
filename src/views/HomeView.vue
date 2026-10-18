<template>
  <div class="fill-height">
    <v-container fluid class="fill-height" v-resize="onResize">
      <div>
        details about log of whats happed(stats)
      </div>
      <v-card class="d-flex" :height="windowSize.y - 180" width="100%" flat tile>
        <v-card width="350px" height="100%" class="flex-shrink-0 overflow-hidden">
          <travel-panel />
        </v-card>

        <v-card width="100%" flat tile class="pa-2 map-area">
          <town-map
            :selected-building-id="selectedBuildingId"
            :placing-type-id="placingTypeId"
            @select-building="selectBuilding"
            @place="place"
            @cancel-placement="cancelPlacing"
          />

          <div class="map-overlay">
            <v-btn small :color="showBuildMenu ? 'primary' : undefined" @click="toggleBuildMenu">
              <v-icon left small>mdi-hammer</v-icon> Build
            </v-btn>

            <v-card v-if="showBuildMenu" class="map-overlay__panel mt-2">
              <v-card-title class="text-subtitle-1 py-2">
                Build
                <v-spacer />
                <v-btn icon small @click="showBuildMenu = false"><v-icon small>mdi-close</v-icon></v-btn>
              </v-card-title>
              <v-card-text>
                <build-menu @place="startPlacing" />
              </v-card-text>
            </v-card>

            <div v-else-if="selectedBuilding" class="map-overlay__panel mt-2">
              <building-card :building="selectedBuilding" closable class="mb-0" @close="selectedBuildingId = null" />
            </div>
          </div>
        </v-card>
      </v-card>
    </v-container>

    <v-snackbar v-model="error.show" timeout="3000" color="error" bottom>
      {{ error.text }}
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import BuildingCard from '@/components/BuildingCard.vue'
import BuildMenu from '@/components/BuildMenu.vue'
import TownMap from '@/components/TownMap.vue'
import TravelPanel from '@/components/TravelPanel.vue'
import { PlacedBuilding, Rotation } from '@/game/state'
import { store } from '@/game/store'

export default Vue.extend({
  name: 'HomeView',
  components: {
    BuildingCard,
    BuildMenu,
    TownMap,
    TravelPanel
  },
  data: () => ({
    windowSize: { x: 0, y: 0 },
    selectedBuildingId: null as string | null,
    showBuildMenu: false,
    error: { show: false, text: '' }
  }),
  computed: {
    // Shared with the sidebar, which can also start placing a building.
    placingTypeId (): string | null {
      return store.placingTypeId
    },
    selectedBuilding (): PlacedBuilding | null {
      const game = store.game
      return (game && game.buildings.find(b => b.id === this.selectedBuildingId)) || null
    }
  },
  watch: {
    // However placement starts (build menu or sidebar), close the floating panels so the map is clear.
    placingTypeId (typeId: string | null) {
      if (!typeId) return
      this.showBuildMenu = false
      this.selectedBuildingId = null
    }
  },
  beforeDestroy () {
    store.startPlacing(null)
  },
  created () {
    // New towns start with the ruined town hall open so it's obvious what to do first.
    const game = store.game
    const ruin = game && game.buildings.find(b => b.typeId === 'town_hall' && b.level === 0)
    if (ruin) this.selectedBuildingId = ruin.id
  },
  methods: {
    onResize () {
      this.windowSize = { x: window.innerWidth, y: window.innerHeight }
    },
    selectBuilding (id: string | null) {
      this.selectedBuildingId = id
      if (id) this.showBuildMenu = false
    },
    toggleBuildMenu () {
      this.showBuildMenu = !this.showBuildMenu
      if (this.showBuildMenu) this.selectedBuildingId = null
    },
    startPlacing (typeId: string) {
      store.startPlacing(typeId)
    },
    cancelPlacing () {
      store.startPlacing(null)
    },
    place ({ x, y, rotation }: { x: number, y: number, rotation: Rotation }) {
      if (!this.placingTypeId) return
      const result = store.placeBuilding(this.placingTypeId, x, y, rotation)
      if ('error' in result) {
        this.error = { show: true, text: result.error }
        return
      }
      store.startPlacing(null)
      this.selectedBuildingId = result.buildingId
    }
  }
})
</script>

<style scoped>
.map-area {
  position: relative;
}
/* Floating controls over the top-left of the map. Clicks pass through to the map except on the controls. */
.map-overlay {
  position: absolute;
  top: 16px;
  left: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  pointer-events: none;
}
.map-overlay > * {
  pointer-events: auto;
}
.map-overlay__panel {
  width: 320px;
  max-height: calc(100% - 40px);
  overflow-y: auto;
}
</style>
