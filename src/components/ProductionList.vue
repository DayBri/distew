<template>
  <div>
    <template v-for="entry in entries">
      <v-subheader :key="entry.building.id + '-header'" class="pr-2">
        {{ entry.label }}
        <v-spacer />
        <v-btn
          x-small
          text
          :disabled="!entry.canCollect"
          :title="'Collect from ' + entry.label"
          @click="collect(entry.building.id)"
        >
          <v-icon x-small left>mdi-basket</v-icon> Collect
        </v-btn>
      </v-subheader>
      <v-list :key="entry.building.id + '-list'" dense>
        <v-list-item
          v-for="item in entry.items"
          :key="item.id"
          link
          :disabled="!entry.canCollect"
          @click="collect(entry.building.id)"
        >
          <v-list-item-icon class="mr-3"><v-icon small>{{ item.icon }}</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ item.name }}</v-list-item-title>
          </v-list-item-content>
          <v-list-item-action-text class="text-body-2" :class="{ 'warning--text': item.full }">
            {{ item.stored }} / {{ entry.cap }}
          </v-list-item-action-text>
        </v-list-item>
      </v-list>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { BUILDINGS } from '@/game/data/buildings'
import { RESOURCES } from '@/game/data/resources'
import { productionRates, storageCap } from '@/game/engine'
import { PlacedBuilding } from '@/game/state'
import { store } from '@/game/store'

interface ProductionEntry {
  building: PlacedBuilding
  label: string
  cap: number
  canCollect: boolean
  items: { id: string, name: string, icon: string, stored: number, full: boolean }[]
}

// Sidebar section for every building that produces something, with what it has ready to collect.
export default Vue.extend({
  name: 'ProductionList',
  computed: {
    entries (): ProductionEntry[] {
      const game = store.game
      if (!game) return []

      return game.buildings.filter(building => productionRates(game, building).length).map(building => {
        const cap = storageCap(building)
        const items = productionRates(game, building).map(({ resource }) => {
          const stored = Math.floor(building.stored[resource] || 0)
          return { id: resource, ...RESOURCES[resource], stored, full: stored >= cap }
        })

        const label = BUILDINGS[building.typeId].name
        return { building, label, cap, items, canCollect: items.some(item => item.stored >= 1) }
      })
    }
  },
  methods: {
    collect (buildingId: string) {
      store.collect(buildingId)
    }
  }
})
</script>
