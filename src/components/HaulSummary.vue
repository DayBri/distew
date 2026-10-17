<template>
  <div>
    <div v-if="isEmpty" class="text-caption grey--text">Nothing found yet.</div>
    <div v-if="resources.length" class="mb-1">
      <v-chip v-for="item in resources" :key="item.id" small class="mr-1 mb-1">
        <v-icon x-small left>{{ item.icon }}</v-icon> {{ item.amount }} {{ item.name }}
      </v-chip>
    </div>
    <div v-if="treasures.length" class="mb-1">
      <v-chip
        v-for="(treasure, index) in treasures"
        :key="treasure.id + index"
        small
        outlined
        class="mr-1 mb-1"
        :color="treasure.color"
      >
        <v-icon x-small left>mdi-treasure-chest</v-icon> {{ treasure.name }}
      </v-chip>
    </div>
    <div v-if="blueprints.length" class="mb-1">
      <v-chip v-for="blueprint in blueprints" :key="blueprint.id" small outlined color="cyan" class="mr-1 mb-1">
        <v-icon x-small left>mdi-file-document-outline</v-icon> {{ blueprint.name }} blueprint
      </v-chip>
    </div>
    <div v-if="haul.recruits.length">
      <v-chip v-for="person in haul.recruits" :key="person.id" small outlined color="amber" class="mr-1 mb-1">
        <v-icon x-small left>mdi-account-plus</v-icon> {{ person.name }}
      </v-chip>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { Blueprint, BLUEPRINTS_BY_ID, RARITIES, TREASURES_BY_ID } from '@/game/data/items'
import { RESOURCES, ResourceId } from '@/game/data/resources'
import { AdventureHaul } from '@/game/state'

// What's been picked up on an adventure: resources, treasures, blueprints and recruits.
export default Vue.extend({
  name: 'HaulSummary',
  props: {
    haul: { type: Object as PropType<AdventureHaul>, required: true }
  },
  computed: {
    resources (): { id: string, name: string, icon: string, amount: number }[] {
      return (Object.keys(this.haul.resources) as ResourceId[])
        .filter(id => (this.haul.resources[id] || 0) > 0)
        .map(id => ({ id, ...RESOURCES[id], amount: this.haul.resources[id] || 0 }))
    },
    treasures (): { id: string, name: string, color: string }[] {
      return this.haul.treasureIds.map(id => {
        const treasure = TREASURES_BY_ID[id]
        return { id, name: treasure.name, color: RARITIES[treasure.rarity].color }
      })
    },
    blueprints (): Blueprint[] {
      return this.haul.blueprintIds.map(id => BLUEPRINTS_BY_ID[id])
    },
    isEmpty (): boolean {
      return !this.resources.length && !this.treasures.length && !this.blueprints.length && !this.haul.recruits.length
    }
  }
})
</script>
