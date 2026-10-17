<template>
  <div>
    <v-card v-for="option in options" :key="option.type.id" outlined class="mb-3">
      <v-card-title class="text-subtitle-1 py-2">
        <v-icon left>{{ option.type.icon }}</v-icon>
        {{ option.type.name }}
        <v-spacer />
        <span class="text-caption">{{ option.type.footprint.w }}×{{ option.type.footprint.h }}</span>
      </v-card-title>
      <v-card-text>
        <div class="mb-2">{{ option.level.description }}</div>
        <div v-for="[id, amount] in option.costs" :key="id" class="d-flex align-center">
          <v-icon x-small class="mr-2">{{ resources[id].icon }}</v-icon>
          <span>{{ resources[id].name }}</span>
          <v-spacer />
          <span :class="game.resources[id] >= amount ? 'success--text' : 'error--text'">
            {{ game.resources[id] }} / {{ amount }}
          </span>
        </div>
        <div class="text-caption mt-2">
          <v-icon x-small>mdi-clock-outline</v-icon> {{ option.duration }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn block color="primary" :disabled="!!option.blocker" @click="$emit('place', option.type.id)">
          Place
        </v-btn>
      </v-card-actions>
      <div v-if="option.blocker" class="text-caption text-center pb-2">{{ option.blocker }}</div>
    </v-card>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { BUILDABLE_TYPES, BuildingLevel, BuildingType } from '@/game/data/buildings'
import { RESOURCES, ResourceId } from '@/game/data/resources'
import { buildDurationMs, costEntries, placementBlocker } from '@/game/engine'
import { formatDuration } from '@/game/format'
import { GameState } from '@/game/state'
import { store } from '@/game/store'

interface BuildOption {
  type: BuildingType
  level: BuildingLevel
  costs: [ResourceId, number][]
  duration: string
  blocker: string | null
}

export default Vue.extend({
  name: 'BuildMenu',
  data: () => ({
    resources: RESOURCES
  }),
  computed: {
    game (): GameState {
      return store.game as GameState
    },
    options (): BuildOption[] {
      return BUILDABLE_TYPES.map(type => {
        const level = type.levels[0]
        return {
          type,
          level,
          costs: costEntries(level.cost),
          duration: formatDuration(buildDurationMs(this.game, level.buildSeconds)),
          blocker: placementBlocker(this.game, type.id)
        }
      })
    }
  }
})
</script>
