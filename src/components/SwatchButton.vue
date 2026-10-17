<template>
  <button
    type="button"
    class="swatch mr-2 mb-2"
    :class="{ 'swatch--selected': selected }"
    :style="{ backgroundColor: color }"
    :aria-label="color"
    :aria-pressed="selected"
    @click="$emit('click')"
  />
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'SwatchButton',
  props: {
    color: { type: String, required: true },
    selected: { type: Boolean, default: false }
  }
})
</script>

<style scoped>
.swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  outline: none;
}
.swatch--selected {
  border-color: white;
  box-shadow: 0 0 0 2px var(--v-primary-base);
}
</style>
