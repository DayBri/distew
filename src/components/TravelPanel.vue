<template>
  <div class="travel-panel">
    <div class="travel-panel__scene">
      <travel-scene ref="scene" :walking="travelling" :character-color="characterColor" />
      <div class="travel-panel__status text-caption">
        <template v-if="travelling">{{ length.name }} · {{ timeLeft }} left</template>
        <template v-else>Resting at home</template>
      </div>
    </div>

    <div class="travel-panel__body">
      <!-- On the road -->
      <template v-if="travelling">
        <v-progress-linear :value="progress" height="8" rounded color="amber" class="mb-3" />
        <haul-summary :haul="adventure.haul" class="mb-3" />
        <adventure-log :entries="adventure.log" :started-at="adventure.startedAt" />
      </template>

      <!-- Back home: summary of what came back -->
      <template v-else-if="adventure">
        <div class="text-h6" :class="adventure.status === 'injured' ? 'error--text' : 'success--text'">
          {{ adventure.status === 'injured' ? 'Came home hurt' : 'Back home safe' }}
        </div>
        <div class="text-caption mb-3">{{ length.name }} · {{ adventure.log.length }} events</div>
        <haul-summary :haul="adventure.haul" class="mb-3" />
        <v-btn block color="primary" class="mb-4" @click="dismiss">Done</v-btn>
        <adventure-log :entries="adventure.log" :started-at="adventure.startedAt" />
      </template>

      <!-- Choosing where to go -->
      <template v-else>
        <div class="text-subtitle-2 mb-2">Go on an adventure</div>
        <v-item-group v-model="selectedLengthId" mandatory>
          <v-item v-for="option in lengths" :key="option.id" v-slot="{ active, toggle }" :value="option.id">
            <v-card outlined class="mb-2 pa-3" :style="active ? { borderColor: 'white' } : null" @click="toggle">
              <div class="d-flex">
                <strong>{{ option.name }}</strong>
                <v-spacer />
                <span class="text-caption">{{ option.minutes }} min</span>
              </div>
              <div class="text-caption">{{ option.description }}</div>
            </v-card>
          </v-item>
        </v-item-group>
        <div v-if="firstAdventure" class="text-caption mb-2">
          <v-icon x-small>mdi-account-plus</v-icon> You're sure to meet someone on your first adventure.
        </div>
        <v-btn block color="primary" class="mb-4" @click="setOut">
          <v-icon left>mdi-hiking</v-icon> Set out
        </v-btn>

        <div class="text-subtitle-2 mb-1">Equipment</div>
        <div v-for="(slot, id) in slots" :key="id" class="d-flex align-center mb-1">
          <v-icon small class="mr-2">{{ slot.icon }}</v-icon>
          <span>{{ slot.name }}</span>
          <v-spacer />
          <span class="text-caption grey--text">{{ equipment[id] || 'Empty' }}</span>
        </div>
        <div class="d-flex align-center text-caption mt-2">
          <span>Combat power</span>
          <v-spacer />
          <span>{{ combatPower }}</span>
        </div>
        <div class="d-flex align-center text-caption">
          <span>Chance a traveller joins you</span>
          <v-spacer />
          <span>{{ recruitChance }}%</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import AdventureLog from '@/components/AdventureLog.vue'
import HaulSummary from '@/components/HaulSummary.vue'
import TravelScene from '@/components/TravelScene.vue'
import { adventureLength, combatPower, recruitChance } from '@/game/adventure'
import { ADVENTURE_LENGTHS, AdventureLength } from '@/game/data/adventures'
import { CHARACTER_CLASSES } from '@/game/data/characters'
import { EQUIPMENT_SLOTS } from '@/game/data/items'
import { formatDuration } from '@/game/format'
import { Adventure, AdventureLogEntry, GameState } from '@/game/state'
import { store } from '@/game/store'

// Only animate encounters that just happened, not ones caught up after time away.
const LIVE_EVENT_MS = 5000

export default Vue.extend({
  name: 'TravelPanel',
  components: { AdventureLog, HaulSummary, TravelScene },
  data: () => ({
    lengths: ADVENTURE_LENGTHS,
    slots: EQUIPMENT_SLOTS,
    selectedLengthId: ADVENTURE_LENGTHS[0].id
  }),
  computed: {
    game (): GameState {
      return store.game as GameState
    },
    adventure (): Adventure | null {
      return this.game.adventure
    },
    travelling (): boolean {
      return !!this.adventure && this.adventure.status === 'travelling'
    },
    length (): AdventureLength {
      return adventureLength(this.adventure ? this.adventure.lengthId : this.selectedLengthId)
    },
    progress (): number {
      if (!this.adventure) return 0
      const { startedAt, endsAt } = this.adventure
      return Math.min(100, ((store.now - startedAt) / (endsAt - startedAt)) * 100)
    },
    timeLeft (): string {
      return this.adventure ? formatDuration(Math.max(0, this.adventure.endsAt - store.now)) : ''
    },
    characterColor (): string {
      return CHARACTER_CLASSES[this.game.player.classId].color
    },
    firstAdventure (): boolean {
      return this.game.stats.adventuresCompleted === 0
    },
    equipment (): Record<string, string | null> {
      return this.game.player.equipment
    },
    combatPower (): string {
      return combatPower(this.game).toFixed(1)
    },
    recruitChance (): number {
      return Math.round(recruitChance(this.game) * 100)
    },
    lastEntry (): AdventureLogEntry | null {
      const log = this.adventure ? this.adventure.log : []
      return log.length ? log[log.length - 1] : null
    }
  },
  watch: {
    lastEntry (entry: AdventureLogEntry | null) {
      if (!entry || entry.kind === 'home' || Date.now() - entry.at > LIVE_EVENT_MS) return
      const scene = this.$refs.scene as InstanceType<typeof TravelScene> | undefined
      if (scene) scene.showEncounter(entry.kind)
    }
  },
  methods: {
    setOut () {
      store.startAdventure(this.selectedLengthId)
    },
    dismiss () {
      store.dismissAdventure()
    }
  }
})
</script>

<style scoped>
.travel-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.travel-panel__scene {
  position: relative;
  flex: 0 0 45%;
  min-height: 200px;
}
.travel-panel__status {
  position: absolute;
  left: 8px;
  bottom: 8px;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
}
.travel-panel__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 12px;
}
</style>
