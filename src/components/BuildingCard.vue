<template>
  <v-card outlined class="mb-3" :style="selected ? { borderColor: 'white' } : null">
    <v-card-title class="text-subtitle-1 py-2">
      <v-icon left>{{ type.icon }}</v-icon>
      {{ name }}
      <v-spacer />
      <span class="text-caption">Lv {{ building.level }}</span>
      <v-btn v-if="closable" icon small class="ml-1" @click.stop="$emit('close')"><v-icon small>mdi-close</v-icon></v-btn>
    </v-card-title>

    <v-card-text v-if="gatherNames || rates.length" class="pb-0">
      <div v-if="gatherNames" class="mb-1">
        <div class="text-overline">Gather by hand</div>
        <div class="text-body-2">{{ gatherNames }} – click them in the sidebar.</div>
      </div>
      <div v-if="rates.length">
        <div class="text-overline">Automatic</div>
        <div v-for="rate in rates" :key="rate.resource" class="d-flex align-center">
          <v-icon x-small class="mr-2">{{ resources[rate.resource].icon }}</v-icon>
          <span>{{ resources[rate.resource].name }}</span>
          <v-spacer />
          <span class="text-caption">+{{ formatRate(rate.perMinute) }}/min</span>
        </div>
      </div>
    </v-card-text>

    <v-card-text v-if="isConstructing">
      <div class="mb-1">{{ actionLabel }}ing… {{ formatDuration(timeLeftMs) }} left</div>
      <v-progress-linear :value="progress" height="10" rounded color="amber" />
    </v-card-text>

    <v-card-text v-else-if="next">
      <div class="text-overline">Next: {{ next.name }}</div>
      <div class="mb-2">{{ next.description }}</div>
      <div v-for="[id, amount] in costs" :key="id" class="d-flex align-center">
        <v-icon x-small class="mr-2">{{ resources[id].icon }}</v-icon>
        <span>{{ resources[id].name }}</span>
        <v-spacer />
        <span :class="have(id) >= amount ? 'success--text' : 'error--text'">
          {{ have(id) }} / {{ amount }}
        </span>
      </div>
      <div class="text-caption mt-2">
        <v-icon x-small>mdi-clock-outline</v-icon> {{ formatDuration(durationMs) }}
      </div>
    </v-card-text>

    <v-card-text v-else>Max level</v-card-text>

    <v-card-actions v-if="next && !isConstructing">
      <v-btn block color="primary" :disabled="!!blockedReason" @click.stop="build">
        {{ actionLabel }}
      </v-btn>
    </v-card-actions>
    <div v-if="next && !isConstructing && blockedReason" class="text-caption text-center pb-2">
      {{ blockedReason }}
    </div>
  </v-card>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { BUILDINGS, BuildingLevel, BuildingType, levelInfo, Production } from '@/game/data/buildings'
import { RESOURCES, ResourceId } from '@/game/data/resources'
import { buildDurationMs, buildingName, constructionBlocker, costEntries, gatherable, productionRates } from '@/game/engine'
import { GameState, PlacedBuilding } from '@/game/state'
import { store } from '@/game/store'
import { formatDuration } from '@/game/format'

export default Vue.extend({
  name: 'BuildingCard',
  props: {
    building: { type: Object as PropType<PlacedBuilding>, required: true },
    selected: { type: Boolean, default: false },
    closable: { type: Boolean, default: false }
  },
  data: () => ({
    resources: RESOURCES
  }),
  computed: {
    game (): GameState {
      return store.game as GameState
    },
    type (): BuildingType {
      return BUILDINGS[this.building.typeId]
    },
    name (): string {
      return buildingName(this.building)
    },
    next (): BuildingLevel | undefined {
      return levelInfo(this.building.typeId, this.building.level + 1)
    },
    costs (): [ResourceId, number][] {
      return this.next ? costEntries(this.next.cost) : []
    },
    rates (): Production[] {
      return productionRates(this.game, this.building)
    },
    gatherNames (): string {
      return gatherable(this.building).map(id => RESOURCES[id].name).join(', ')
    },
    actionLabel (): string {
      if (this.building.level > 0) return 'Upgrade'
      return this.type.ruinedName ? 'Repair' : 'Build'
    },
    durationMs (): number {
      return this.next ? buildDurationMs(this.game, this.next.buildSeconds) : 0
    },
    isConstructing (): boolean {
      const construction = this.game.construction
      return !!construction && construction.buildingId === this.building.id
    },
    timeLeftMs (): number {
      const construction = this.game.construction
      return construction ? Math.max(0, construction.finishesAt - store.now) : 0
    },
    progress (): number {
      const construction = this.game.construction
      if (!construction) return 0
      const total = construction.finishesAt - construction.startedAt
      return Math.min(100, ((store.now - construction.startedAt) / total) * 100)
    },
    blockedReason (): string {
      return (this.next && constructionBlocker(this.game, this.next)) || ''
    }
  },
  methods: {
    have (id: ResourceId): number {
      return this.game.resources[id]
    },
    build () {
      store.startConstruction(this.building.id)
    },
    formatRate (perMinute: number): string {
      return Number.isInteger(perMinute) ? String(perMinute) : perMinute.toFixed(1)
    },
    formatDuration
  }
})
</script>
