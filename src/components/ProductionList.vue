<template>
  <div>
    <template v-for="section in sections">
      <v-divider :key="section.type.id + '-divider'" />
      <v-subheader :key="section.type.id + '-header'">
        <v-icon v-if="section.status === 'locked'" x-small class="mr-1">mdi-lock</v-icon>
        {{ section.type.name }}
        <v-spacer />
        <span v-if="section.building && section.building.level > 0" class="text-caption">Lv {{ section.building.level }}</span>
      </v-subheader>

      <v-list v-if="section.rows.length" :key="section.type.id + '-list'" dense>
        <v-list-item
          v-for="row in section.rows"
          :key="row.id"
          :link="row.canGather"
          :inactive="!row.canGather"
          :title="row.canGather ? 'Click to gather 1 ' + row.name.toLowerCase() : ''"
          @click="row.canGather && gather(section.building.id, row.id)"
        >
          <v-list-item-icon class="mr-3"><v-icon small>{{ row.icon }}</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ row.name }}</v-list-item-title>
            <v-list-item-subtitle v-if="row.perMinute" class="text-caption">+{{ formatRate(row.perMinute) }}/min</v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action-text class="text-body-2">{{ row.amount }}</v-list-item-action-text>
          <v-icon v-if="row.canGather" x-small class="ml-2">mdi-plus-circle-outline</v-icon>
        </v-list-item>
      </v-list>

      <div v-if="section.status === 'constructing'" :key="section.type.id + '-building'" class="px-4 pb-3 text-caption">
        Under construction…
      </div>

      <div v-else-if="section.status === 'locked'" :key="section.type.id + '-locked'" class="px-4 pb-3">
        <div class="text-caption mb-1">
          <span v-for="(cost, index) in section.costs" :key="cost.id">
            <span :class="cost.enough ? 'success--text' : 'error--text'">{{ cost.amount }} {{ cost.name.toLowerCase() }}</span>
            <span v-if="index < section.costs.length - 1"> · </span>
          </span>
        </div>
        <v-btn x-small block :disabled="!!section.blocker" @click="build(section.type.id)">
          <v-icon x-small left>mdi-hammer</v-icon> Build {{ section.type.name }}
        </v-btn>
        <div v-if="section.blocker" class="text-caption mt-1">{{ section.blocker }}</div>
      </div>
    </template>

    <template v-if="otherFinds.length">
      <v-divider />
      <v-subheader>Other finds</v-subheader>
      <v-list dense>
        <v-list-item v-for="row in otherFinds" :key="row.id" inactive>
          <v-list-item-icon class="mr-3"><v-icon small>{{ row.icon }}</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ row.name }}</v-list-item-title>
          </v-list-item-content>
          <v-list-item-action-text class="text-body-2">{{ row.amount }}</v-list-item-action-text>
        </v-list-item>
      </v-list>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { BUILDABLE_TYPES, BuildingType, levelInfo } from '@/game/data/buildings'
import { RESOURCE_IDS, RESOURCES, ResourceId, STARTER_RESOURCES } from '@/game/data/resources'
import { costEntries, gatherable, placementBlocker, productionRates } from '@/game/engine'
import { GameState, PlacedBuilding } from '@/game/state'
import { store } from '@/game/store'

interface Row {
  id: ResourceId
  name: string
  icon: string
  amount: number
  canGather: boolean
  perMinute: number
}

interface Section {
  type: BuildingType
  building: PlacedBuilding | null
  status: 'locked' | 'constructing' | 'built'
  rows: Row[]
  costs: { id: ResourceId, name: string, amount: number, enough: boolean }[]
  blocker: string | null
}

// Not shown under "Other finds": starter materials have their own list and gold is shown in the top bar.
const HIDDEN_FROM_OTHER: ResourceId[] = [...STARTER_RESOURCES, 'gold']

// Sidebar section per resource building: its materials, click-to-gather, and how to unlock it.
export default Vue.extend({
  name: 'ProductionList',
  computed: {
    game (): GameState {
      return store.game as GameState
    },
    sections (): Section[] {
      const game = this.game
      return BUILDABLE_TYPES.filter(type => type.resources && type.resources.length).map(type => {
        const building = game.buildings.find(b => b.typeId === type.id) || null
        const status = !building ? 'locked' : building.level === 0 ? 'constructing' : 'built'
        const canGather = building ? gatherable(building) : []
        const rates = building ? productionRates(game, building) : []

        // A resource shows once the building can make it, or if you already have some (e.g. from an adventure).
        const rows = (type.resources || [])
          .map(id => {
            const rate = rates.find(r => r.resource === id)
            return {
              id,
              ...RESOURCES[id],
              amount: game.resources[id],
              canGather: canGather.includes(id),
              perMinute: rate ? rate.perMinute : 0
            }
          })
          .filter(row => row.canGather || row.perMinute > 0 || row.amount > 0)

        const firstLevel = levelInfo(type.id, 1)
        const costs = firstLevel
          ? costEntries(firstLevel.cost).map(([id, amount]) => ({
            id,
            name: RESOURCES[id].name,
            amount,
            enough: game.resources[id] >= amount
          }))
          : []

        return { type, building, status, rows, costs, blocker: building ? null : placementBlocker(game, type.id) }
      })
    },
    // Materials that don't belong to a building yet (e.g. logs and sap found on adventures).
    otherFinds (): Row[] {
      const owned = new Set(BUILDABLE_TYPES.flatMap(type => type.resources || []))
      return RESOURCE_IDS
        .filter(id => !owned.has(id) && !HIDDEN_FROM_OTHER.includes(id) && this.game.resources[id] > 0)
        .map(id => ({ id, ...RESOURCES[id], amount: this.game.resources[id], canGather: false, perMinute: 0 }))
    }
  },
  methods: {
    gather (buildingId: string, resource: ResourceId) {
      store.gather(buildingId, resource)
    },
    build (typeId: string) {
      store.startPlacing(typeId)
      // Buildings are placed on the town map.
      if (this.$route.name !== 'home') this.$router.push({ name: 'home' })
    },
    formatRate (perMinute: number): string {
      return Number.isInteger(perMinute) ? String(perMinute) : perMinute.toFixed(1)
    }
  }
})
</script>
