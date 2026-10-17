<template>
  <div>
    <div class="text-subtitle-2 mb-1">Journal</div>
    <div v-if="!entries.length" class="text-caption grey--text">Setting off down the path…</div>
    <div v-for="(entry, index) in newestFirst" :key="entry.at + '-' + index" class="d-flex text-body-2 mb-1">
      <span class="text-caption grey--text mr-2 flex-shrink-0">{{ elapsed(entry.at) }}</span>
      <span :class="toneClass[entry.tone]">{{ entry.text }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { AdventureLogEntry } from '@/game/state'

export default Vue.extend({
  name: 'AdventureLog',
  props: {
    entries: { type: Array as PropType<AdventureLogEntry[]>, required: true },
    startedAt: { type: Number, required: true }
  },
  data: () => ({
    toneClass: {
      good: 'success--text',
      bad: 'error--text',
      rare: 'amber--text',
      neutral: ''
    }
  }),
  computed: {
    newestFirst (): AdventureLogEntry[] {
      return this.entries.slice().reverse()
    }
  },
  methods: {
    // Minutes into the adventure, e.g. "12m".
    elapsed (at: number): string {
      return `${Math.round((at - this.startedAt) / 60000)}m`
    }
  }
})
</script>
