<template>
  <div class="page-container">
    <md-app md-waterfall md-mode="overlap">
      <md-app-toolbar class="md-primary md-large">
        <div class="md-toolbar-row">
          <span class="md-title">YouTube Downloader</span>
        </div>
      </md-app-toolbar>


      <md-app-content v-if="!isMetaView">
        <center>
          <div style="background: #00000011; border-radius: 6px; padding: 4px 16px !important; display: flex; margin: .5em 6em;">
            <md-field>
              <md-input class="dl-input" :disabled="isDownloadingMeta" v-model="url" placeholder="YouTube URL or other media URL"></md-input>
            </md-field>
            <md-progress-spinner v-if="isDownloadingMeta" :md-diameter="30" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
            <md-button v-else class="md-icon-button md-raised md-primary dl-btn" @click="isDownloadingMeta = true; downloadBtn()">
              <md-icon>arrow_downward</md-icon>
            </md-button>
          </div>
        </center>

        <br>

        <h1>Downloads</h1>

        <br>
        <br>
        <br>
      </md-app-content>
      <md-app-content v-else>
        <md-content class="md-elevation-7" style="padding: 1em">
          <div class="m-table">
            <img :src="meta.thumbnail" style="width: 24em"></img>
            <div>
              <h1>{{ meta.title }}</h1>
              <h2>...</h2>
            </div>
          </div>
        </md-content>
      </md-app-content>
    </md-app>
  </div>
</template>

<style lang="scss" scoped>
  .md-app {
    max-height: 400px;
    border: 1px solid rgba(#000, .12);
  }

   // Demo purposes only
  .md-drawer {
    width: 230px;
    max-width: calc(100vw - 125px);
  }

  .md-app-content {
    padding: 3em;
    margin: -64px 12em 12em !important;
  }

  .dl-btn {
    margin: .75em;
  }

  .dl-input {

  }

  .md-progress-spinner {
    margin: 24px;
  }

  .m-table {
    display: flex;
    flex-direction: row;
  }
  .m-table > * {
    padding: 1em;
  }
</style>

<script>
const Client = require('../src/client/')(module.hot ? 'http://localhost:5344' : window.location.origin)

export default {
  name: 'app',
  data: () => ({
    isDownloadingMeta: false,
    isMetaView: false,
    meta: {}
  }),
  methods: {
    async downloadBtn() {
      let meta
      try {
        meta = await Client.metadata(this.$data.url)
      } catch (e) {
        // TODO: display error
      }
      this.$data.url = ''
      this.$data.meta = meta
      this.$data.isMetaView = true
      this.$data.isDownloadingMeta = false
    }
  }
}
</script>
