<template>
  <div>
      <v-container>
        <h1>Spinner</h1>
        <v-row>
          <v-col>
            spinner box
          </v-col>
        </v-row>
        <v-btn>
          Spin
        </v-btn>
        <v-btn @click="generateItems">
          Load crate
        </v-btn>
        <template v-for="(item, index) in itemArray" >
          <div :key="index">
            {{item}}
          </div>
        </template>
      </v-container>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
/* eslint-disable */

/*
  Logic percent chance to 'spawn'
  Green: 79.92%    
  Blue: 15.98%     
  Pink: 3.2%     
  Red:  0.64%      
  Gold: 0.26%      
*/
export default Vue.extend({
  name: 'SpinnerView',
  components: {
  },
  data() {
    return {
      maxDistinctItems: 15,  
      maxTotalItems: 4, 
      itemArray: [] as Array<any>,
      max: 4000,
      min: 0.01,
      greenItems: ['green 1', 'green 2','green 3','green 4','green 5','green 6','green 7','green 8','green 9','green 10','green 11','green 12','green 13','green 14','green 15','green 16','green 17',],
      blueItems: ['blue 1', 'blue 2'],
      pinkItems: ['pink 1', 'pink 2', 'pink 3'],
      redItems: ['red 1', 'red 2', 'red 3'],
      goldItems: ['gold 1', 'gold 2', 'gold 3'],
    } 
  },
  methods: {
    async generateItems()
    {
      this.itemArray = [] as Array<string>;
      for(var i = 0; i < this.maxTotalItems; i++)
      {
        var number = Math.floor(Math.random() * (this.max - this.min) + this.min);
        var percent = (number * 100) / this.max;
        var item = await this.getItemType(percent);
        this.itemArray.push(item);
      }
    },
    getItemType(percent)
    {
      switch(percent)
      {
        case ((percent > 0.00 && percent < 79.92) ? percent : -1):
          var item = this.getItemFromCategory('g');
          return item;
        case ((percent > 79.92 && percent < 95.90) ? percent : -1):
          var item = this.getItemFromCategory('b');
          return item;
        case ((percent > 95.90 && percent < 99.10) ? percent : -1):
          var item = this.getItemFromCategory('p');
          return item;
        case ((percent > 99.10 && percent < 99.74) ? percent : -1):
          var item = this.getItemFromCategory('r');
          return item;
        case ((percent > 99.74 && percent < 100.00) ? percent : -1):
          var item = this.getItemFromCategory('u');
          return item;
        default:
          return 'null';
      }
    },
    getItemFromCategory(category)
    {
      switch(category)
      {
        case 'g':
          var index = Math.floor(Math.random() * (this.greenItems.length - 0) + 0);
          return this.greenItems[index];
          break;
        case 'b':
          var index = Math.floor(Math.random() * (this.blueItems.length - 0) + 0);
          return this.blueItems[index];
          break;
        case 'p':
          var index = Math.floor(Math.random() * (this.pinkItems.length - 0) + 0);
          return this.pinkItems[index];
          break;
        case 'r':
          var index = Math.floor(Math.random() * (this.redItems.length - 0) + 0);
          return this.redItems[index];
          break;
        case 'u':
          var index = Math.floor(Math.random() * (this.goldItems.length - 0) + 0);
          return this.goldItems[index];
          break;
      }
    },
  }
})
</script>

