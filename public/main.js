'use strict'

import Vue from 'vue/dist/vue.esm.js'
import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.min.css'
import 'vue-material/dist/theme/default.css'

Vue.use(VueMaterial)

import app from './app.vue'

window.onload = () => {
  new Vue({
    el: 'app',
    components: {
      app
    }
  })
}
