<template>
  <v-app>
    <v-app-bar app color="secondary" dark clipped-left dense>
      <v-spacer />
      <v-toolbar-title class="text-subtitle-1 font-weight-bold">IDLE GAME</v-toolbar-title>
      <v-spacer />
      <template v-if="game">
        <span class="mr-4" title="Gold">
          <v-icon small color="amber">{{ goldIcon }}</v-icon> {{ gold }}
        </span>
        <span class="mr-2">Day {{ game.day }}</span>
        <v-menu offset-y left>
          <template #activator="{ on, attrs }">
            <v-btn icon v-bind="attrs" v-on="on"><v-icon>mdi-dots-vertical</v-icon></v-btn>
          </template>
          <v-list dense>
            <v-list-item @click="abandon">
              <v-list-item-title>Abandon save &amp; start over</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
    </v-app-bar>

    <v-navigation-drawer v-if="game" permanent app clipped width="220">
      <v-list-item class="py-2">
        <avatar-placeholder :appearance="game.player.appearance" :size="48" class="mr-3" />
        <v-list-item-content>
          <v-list-item-title class="text-h6">{{ game.player.name }}</v-list-item-title>
          <v-list-item-subtitle>{{ playerClass && playerClass.name }}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>

      <v-divider />

      <v-list dense nav>
        <v-list-item link :to="{ name: 'home' }" exact>
          <v-list-item-icon><v-icon>mdi-home-group</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Town</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="shopUnlocked" link :to="{ name: 'shop' }">
          <v-list-item-icon><v-icon>mdi-store</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Shop</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <v-divider />

      <v-list dense nav>
        <v-list-item link @click="forage">
          <v-list-item-icon><v-icon>mdi-grass</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Forage</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <v-divider />

      <v-subheader>Materials</v-subheader>
      <v-list dense>
        <v-list-item v-for="material in materials" :key="material.id">
          <v-list-item-icon class="mr-3"><v-icon small>{{ material.icon }}</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ material.name }}</v-list-item-title>
          </v-list-item-content>
          <v-list-item-action-text class="text-body-2">{{ material.amount }}</v-list-item-action-text>
        </v-list-item>
        <v-list-item v-if="!materials.length">
          <v-list-item-subtitle>Nothing yet – try foraging.</v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <production-list />
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>

    <v-snackbar v-model="snackbar.show" timeout="4000" color="success" bottom right>
      {{ snackbar.text }}
    </v-snackbar>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue'
import AvatarPlaceholder from '@/components/AvatarPlaceholder.vue'
import ProductionList from '@/components/ProductionList.vue'
import { levelInfo } from '@/game/data/buildings'
import { RESOURCES, STARTER_RESOURCES } from '@/game/data/resources'
import { buildingName } from '@/game/engine'
import { store } from '@/game/store'

const TICK_MS = 1000

export default Vue.extend({
  name: 'App',
  components: { AvatarPlaceholder, ProductionList },
  data: () => ({
    tickTimer: 0,
    goldIcon: RESOURCES.gold.icon,
    snackbar: { show: false, text: '' }
  }),
  computed: {
    shopUnlocked (): boolean {
      return store.isUnlocked('shop')
    },
    game () {
      return store.game
    },
    playerClass () {
      return store.playerClass
    },
    materials (): { id: string, name: string, icon: string, amount: number }[] {
      const game = store.game
      if (!game) return []
      return STARTER_RESOURCES
        .filter(id => game.resources[id] > 0)
        .map(id => ({ id, ...RESOURCES[id], amount: game.resources[id] }))
    },
    gold (): number {
      return store.game ? store.game.resources.gold : 0
    }
  },
  mounted () {
    window.addEventListener('beforeunload', store.persist)
    // Tick straight away so anything that finished while the game was closed completes on load.
    this.tick()
    this.tickTimer = window.setInterval(this.tick, TICK_MS)
  },
  beforeDestroy () {
    window.removeEventListener('beforeunload', store.persist)
    window.clearInterval(this.tickTimer)
  },
  methods: {
    tick () {
      const { finishedBuildings, adventure } = store.tick()
      const messages: string[] = []

      if (finishedBuildings.length) {
        const unlocks = finishedBuildings.flatMap(building => {
          const info = levelInfo(building.typeId, building.level)
          return (info && info.unlocks) || []
        })
        messages.push(`${finishedBuildings.map(buildingName).join(', ')} finished!` +
          (unlocks.includes('shop') ? ' The shop is now open.' : ''))
      }
      if (adventure.returned) {
        const game = store.game
        messages.push(game && game.adventure && game.adventure.status === 'injured'
          ? 'You came home hurt from your adventure.'
          : 'You\'re back from your adventure!')
      }

      if (!messages.length) return
      this.snackbar.text = messages.join(' ')
      this.snackbar.show = true
    },
    forage () {
      store.forage()
    },
    abandon () {
      if (!window.confirm('This deletes your town and character for good. Start over?')) return
      store.abandonGame()
      this.$router.replace({ name: 'new-game' })
    }
  }
})
</script>
