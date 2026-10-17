<template>
  <!-- Placeholder until real character art exists: a skin-coloured circle with a hair block. -->
  <div
    class="avatar-placeholder"
    :style="{ width: size + 'px', height: size + 'px', backgroundColor: appearance.skinTone }"
  >
    <div
      v-if="appearance.hairStyle !== 'bald'"
      :class="['hair', 'hair--' + appearance.hairStyle]"
      :style="{ backgroundColor: appearance.hairColor }"
    />
    <v-icon v-if="icon" class="avatar-icon" :size="size * 0.3" color="rgba(0,0,0,0.55)">{{ icon }}</v-icon>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { Appearance } from '@/game/data/appearance'

export default Vue.extend({
  name: 'AvatarPlaceholder',
  props: {
    appearance: { type: Object as PropType<Appearance>, required: true },
    size: { type: Number, default: 96 },
    icon: { type: String, default: '' }
  }
})
</script>

<style scoped>
.avatar-placeholder {
  position: relative;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  overflow: hidden;
  flex-shrink: 0;
}
.hair {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}
.hair--short { height: 30%; }
.hair--long { height: 30%; }
.hair--long::before,
.hair--long::after {
  content: '';
  position: absolute;
  top: 0;
  width: 18%;
  height: 300%;
  background: inherit;
}
.hair--long::before { left: 0; }
.hair--long::after { right: 0; }
.hair--bun { height: 22%; }
.hair--bun::after {
  content: '';
  position: absolute;
  left: 38%;
  top: -40%;
  width: 24%;
  height: 120%;
  border-radius: 50%;
  background: inherit;
}
.avatar-icon {
  position: absolute;
  right: 8%;
  bottom: 8%;
}
</style>
