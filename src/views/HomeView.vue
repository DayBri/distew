
<template>
    <div class="fill-height">
        <v-container fluid class="fill-height" style="background-color:gray;" v-resize="onResize">
            <div>
                    details about log of whats happed(stats)
            </div>
            <v-card class="d-flex" :height="windowSize.y - 180" width="100%" flat tile>
                <v-card width="350px">
                    <v-container>
                        inventory if you view it (also 3d traveller view) (or even dialog log with stranger) (also deeper inspection of materials)
                    </v-container>
                </v-card>
                <v-card width="100%" flat tile>
                    <v-container fluid class="fill-height">
                        <canvas style="border: 1px solid gainsboro;width:100%;height:100%" ></canvas>
                    </v-container>
                </v-card>
            </v-card>
        </v-container>
    </div>
</template>
<script>
/* eslint-disable */
import Vue from 'vue'

export default Vue.extend({
  name: 'HomeView',
  components: {
  },
  data(){
    return {
        windowSize: {
            x: 0,
            y: 0
        }
    }
  },
  methods: {
    onResize () {
        this.windowSize = { x: window.innerWidth, y: window.innerHeight };
    },
  }
})
</script>
