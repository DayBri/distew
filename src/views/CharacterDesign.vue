<template>
  <v-container v-if="characterClass" class="py-10" style="max-width: 900px">
    <v-btn text class="mb-4" :to="{ name: 'new-game' }">
      <v-icon left>mdi-arrow-left</v-icon> Back
    </v-btn>
    <h1 class="text-h4 font-weight-bold text-center mb-8">Design your character</h1>

    <v-row>
      <v-col cols="12" md="5" class="d-flex flex-column align-center">
        <avatar-placeholder :appearance="appearance" :icon="characterClass.icon" :size="180" class="mb-6" />

        <v-text-field
          v-model="name"
          label="Name"
          :counter="nameMaxLength"
          :rules="[nameRule]"
          outlined
          style="width: 100%"
        />

        <div class="align-self-start text-subtitle-2 mb-1">Skin</div>
        <div class="d-flex flex-wrap mb-4 align-self-start">
          <swatch-button
            v-for="color in skinTones"
            :key="color"
            :color="color"
            :selected="appearance.skinTone === color"
            @click="appearance.skinTone = color"
          />
        </div>

        <div class="align-self-start text-subtitle-2 mb-1">Hair</div>
        <div class="d-flex flex-wrap mb-4 align-self-start">
          <swatch-button
            v-for="color in hairColors"
            :key="color"
            :color="color"
            :selected="appearance.hairColor === color"
            @click="appearance.hairColor = color"
          />
        </div>

        <v-btn-toggle v-model="appearance.hairStyle" mandatory dense class="align-self-start">
          <v-btn v-for="(label, id) in hairStyles" :key="id" :value="id" small>{{ label }}</v-btn>
        </v-btn-toggle>
      </v-col>

      <v-col cols="12" md="7">
        <div class="d-flex align-center mb-2">
          <div class="text-h6">{{ characterClass.name }} stats</div>
          <v-spacer />
          <v-chip :color="pointsLeft > 0 ? 'primary' : undefined" small>
            {{ pointsLeft }} bonus point{{ pointsLeft === 1 ? '' : 's' }} left
          </v-chip>
        </div>

        <v-simple-table dense>
          <tbody>
            <tr v-for="trait in traitIds" :key="trait">
              <td>{{ traitLabels[trait] }}</td>
              <td style="width: 45%">
                <v-progress-linear :value="finalTraits[trait] * 10" height="8" rounded />
              </td>
              <td class="text-right" style="width: 40px">{{ finalTraits[trait] }}</td>
              <td class="text-right" style="width: 90px">
                <v-btn icon x-small :disabled="!bonus[trait]" @click="changeBonus(trait, -1)">
                  <v-icon>mdi-minus</v-icon>
                </v-btn>
                <v-btn icon x-small :disabled="!canIncrease(trait)" @click="changeBonus(trait, 1)">
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-simple-table>

        <v-btn
          block
          x-large
          color="primary"
          class="mt-8"
          :disabled="!canStart"
          @click="start"
        >
          Start game
        </v-btn>
        <div v-if="pointsLeft > 0" class="text-caption text-center mt-2">
          You can still spend {{ pointsLeft }} bonus point{{ pointsLeft === 1 ? '' : 's' }}.
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import AvatarPlaceholder from '@/components/AvatarPlaceholder.vue'
import SwatchButton from '@/components/SwatchButton.vue'
import { defaultAppearance, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from '@/game/data/appearance'
import { CHARACTER_CLASSES, CharacterClass, ClassId, DESIGN_BONUS_POINTS } from '@/game/data/characters'
import { applyTraitBonuses, baseTraits, TRAIT_LABELS, TRAIT_MAX, TraitId, Traits, TRAITS } from '@/game/data/traits'
import { store } from '@/game/store'

const NAME_MAX_LENGTH = 20

export default Vue.extend({
  name: 'CharacterDesign',
  components: { AvatarPlaceholder, SwatchButton },
  data: () => ({
    name: '',
    appearance: defaultAppearance(),
    bonus: {} as Partial<Traits>,
    nameMaxLength: NAME_MAX_LENGTH,
    skinTones: SKIN_TONES,
    hairColors: HAIR_COLORS,
    hairStyles: HAIR_STYLES,
    traitIds: TRAITS,
    traitLabels: TRAIT_LABELS
  }),
  computed: {
    characterClass (): CharacterClass | null {
      return CHARACTER_CLASSES[this.$route.params.classId as ClassId] || null
    },
    classTraits (): Traits {
      return applyTraitBonuses(baseTraits(), this.characterClass ? this.characterClass.traitBonuses : {})
    },
    finalTraits (): Traits {
      return applyTraitBonuses(this.classTraits, this.bonus)
    },
    pointsLeft (): number {
      const spent = Object.values(this.bonus).reduce((sum: number, value) => sum + (value || 0), 0)
      return DESIGN_BONUS_POINTS - spent
    },
    canStart (): boolean {
      return this.nameRule(this.name) === true
    }
  },
  created () {
    if (!this.characterClass) this.$router.replace({ name: 'new-game' })
  },
  methods: {
    nameRule (value: string): boolean | string {
      const trimmed = (value || '').trim()
      if (!trimmed) return 'Your character needs a name'
      if (trimmed.length > NAME_MAX_LENGTH) return `Max ${NAME_MAX_LENGTH} characters`
      return true
    },
    canIncrease (trait: TraitId): boolean {
      return this.pointsLeft > 0 && this.finalTraits[trait] < TRAIT_MAX
    },
    changeBonus (trait: TraitId, delta: number) {
      this.$set(this.bonus, trait, (this.bonus[trait] || 0) + delta)
    },
    start () {
      if (!this.canStart || !this.characterClass) return
      store.startNewGame({
        classId: this.characterClass.id,
        name: this.name,
        appearance: this.appearance,
        bonusTraits: this.bonus
      })
      this.$router.replace({ name: 'home' })
    }
  }
})
</script>
