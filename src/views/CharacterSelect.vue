<template>
  <v-container class="py-10">
    <h1 class="text-h4 font-weight-bold text-center mb-10">Choose your character</h1>
    <v-row justify="center">
      <v-col v-for="characterClass in classes" :key="characterClass.id" cols="12" sm="6" md="4" lg="3">
        <v-card
          class="class-card pa-4"
          :color="characterClass.color"
          height="100%"
          hover
          @click="choose(characterClass.id)"
        >
          <v-sheet class="pa-4 fill-height d-flex flex-column" color="grey lighten-4" light>
            <div class="text-h5 text-center text-uppercase mb-4">{{ characterClass.name }}</div>
            <div class="d-flex justify-center mb-4">
              <avatar-placeholder :appearance="defaultAppearance" :icon="characterClass.icon" :size="96" />
            </div>
            <p class="text-body-2">{{ characterClass.description }}</p>

            <div class="mb-3">
              <v-chip
                v-for="(bonus, trait) in characterClass.traitBonuses"
                :key="trait"
                x-small
                class="mr-1 mb-1"
              >
                +{{ bonus }} {{ traitLabels[trait] }}
              </v-chip>
            </div>

            <div v-for="perk in characterClass.perks" :key="perk.name" class="d-flex align-center mb-1">
              <v-icon small :color="perkIcons[perk.shape].color" class="mr-2">{{ perkIcons[perk.shape].icon }}</v-icon>
              <span class="text-caption"><strong>{{ perk.name }}</strong> – {{ perk.description }}</span>
            </div>
          </v-sheet>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import AvatarPlaceholder from '@/components/AvatarPlaceholder.vue'
import { defaultAppearance } from '@/game/data/appearance'
import { CHARACTER_CLASSES, ClassId, PERK_SHAPE_ICONS } from '@/game/data/characters'
import { TRAIT_LABELS } from '@/game/data/traits'

export default Vue.extend({
  name: 'CharacterSelect',
  components: { AvatarPlaceholder },
  data: () => ({
    classes: Object.values(CHARACTER_CLASSES),
    defaultAppearance: defaultAppearance(),
    perkIcons: PERK_SHAPE_ICONS,
    traitLabels: TRAIT_LABELS
  }),
  methods: {
    choose (classId: ClassId) {
      this.$router.push({ name: 'design-character', params: { classId } })
    }
  }
})
</script>

<style scoped>
.class-card {
  transition: transform 0.15s;
}
.class-card:hover {
  transform: translateY(-4px);
}
</style>
