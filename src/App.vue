
<template>
  <v-app>
    <v-app-bar
      app
      color="secondary"
      dark
      clipped-left
    >
    </v-app-bar>
    <v-navigation-drawer permanent app clipped>
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title class="text-h6">
            Application
          </v-list-item-title>
          <v-list-item-subtitle>
            subtext
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>

      <v-divider></v-divider>

      <v-list
        dense
        nav
      >
        <v-list-item
          v-for="item in items"
          :key="item.title"
          link
          @click="IncreasePerk(item)"
        >
          <v-list-item-icon>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-icon>

          <v-list-item-content>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue'
/* eslint-disable */
export default Vue.extend({
  name: 'App',

  data: () => ({
    items: [
      { title: 'Excavate', icon: 'mdi-shovel', stat: 'excavate' },
      { title: 'My Account', icon: 'mdi-account' },
      { title: 'Users', icon: 'mdi-account-group-outline' }
    ],
    right: null,
  }),
  methods: {
    IncreasePerk (statname) {
      console.log(statname.stat);
    }
  }
})
</script>
