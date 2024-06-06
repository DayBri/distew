/* eslint-disable */
<template>
  <v-app>
    <v-app-bar
      app
      color="secondary"
      dark
      clipped-left
    >
    </v-app-bar>
    <v-navigation-drawer permanent app clipped width="200">
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title class="text-h6">
            Distew
          </v-list-item-title>
          <v-list-item-subtitle>
            an idle game
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
import Collectible from '@/models/collectible'
import User from '@/models/user';
/* eslint-disable */
/* eslint-disable */
export default Vue.extend({
  name: 'App',

  data: () => ({
    items: [
      { title: 'Forage', icon: 'mdi-grass', stat: 'Forage', collects:[new Collectible(0, 'stick', 30), new Collectible(1, 'pebble', 35), new Collectible(2, 'berry', 35)]}
    ],
    right: null,
    user: new User(),
  }),
  methods: {
    IncreasePerk (stat) {
      var perkupdating = this.weightedNumberGenerator(stat.collects);
      this.user.AddMaterial(perkupdating);
    },
    isUserLoggedIn()
    {
      return true;
    },
    weightedNumberGenerator(collectibles: Collectible[]) {
      let assignedPercentage = 0;
      let zeroCount = 0;

      collectibles.forEach((number) => {
        assignedPercentage += number.chance_to_collect;
        if (number.chance_to_collect === 0) {
          zeroCount++;
        }
      });

      const remainingPercentageSplit = (100 - assignedPercentage) / zeroCount;
      const roundedSplit = Math.round(remainingPercentageSplit);
      var resultArray : Collectible[] = [];

      for (const item of collectibles) {
        if (item.chance_to_collect === 0) {
          item.chance_to_collect = roundedSplit;
        }

        for (let i = 1; i < item.chance_to_collect; i++) {
          resultArray.push(item);
        }
      }

      const randomNumber = Math.floor(Math.random() * (resultArray.length));

      return resultArray[randomNumber];
  }
  },
  mounted() {
    //we want to check whether or not that user is logged in
    
  }
})
</script>
