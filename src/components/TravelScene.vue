<template>
  <div ref="viewport" class="travel-scene" />
</template>

<script lang="ts">
import Vue from 'vue'
import { AdventureEventKind } from '@/game/data/adventures'
import { TravelRenderer } from '@/game/render/TravelRenderer'

// Kept outside of `data` so Vue doesn't make the three.js scene reactive.
const renderers = new WeakMap<Vue, TravelRenderer>()

export default Vue.extend({
  name: 'TravelScene',
  props: {
    walking: { type: Boolean, default: false },
    characterColor: { type: String, required: true }
  },
  watch: {
    walking (walking: boolean) {
      const renderer = renderers.get(this)
      if (renderer) renderer.setWalking(walking)
    }
  },
  mounted () {
    const renderer = new TravelRenderer(this.$refs.viewport as HTMLElement, this.characterColor)
    renderer.setWalking(this.walking)
    renderers.set(this, renderer)
  },
  beforeDestroy () {
    const renderer = renderers.get(this)
    if (renderer) renderer.dispose()
    renderers.delete(this)
  },
  methods: {
    showEncounter (kind: AdventureEventKind) {
      const renderer = renderers.get(this)
      if (renderer) renderer.showEncounter(kind)
    }
  }
})
</script>

<style scoped>
.travel-scene {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
