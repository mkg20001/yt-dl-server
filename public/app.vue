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
          <div class="url-field">
            <md-field>
              <md-input class="dl-input" :disabled="isDownloadingMeta" v-model="url" placeholder="YouTube URL or other media URL"></md-input>
            </md-field>
            <md-progress-spinner v-if="isDownloadingMeta" :md-diameter="30" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
            <md-button v-else class="md-icon-button md-raised md-primary dl-btn" @click="isDownloadingMeta = true; downloadBtn()">
              <md-icon>arrow_downward</md-icon>
            </md-button>
          </div>
        </center>

        <div v-if="downloads.length">
          <br>

          <h1>Downloads</h1>

          <br>
          <br>
          <br>
        </div>

        <md-empty-state
          v-else
          md-icon="arrow_downward"
          md-label="Download a video"
          md-description="Downloaded videos will show up here once you download something">
        </md-empty-state>
      </md-app-content>
      <md-app-content v-else>
        <md-content class="md-elevation-7" style="padding: 1em">
          <div class="m-table">
            <img :src="meta.thumbnail" style="height: 9em; max-width: 100%;"></img>
            <div>
              <h1>{{ meta.title }}</h1>
              <h2>...</h2>
            </div>
          </div>
        </md-content>

        <br>

        <md-list>
          <md-subheader class="md-primary">Format</md-subheader>
          <md-list-item>
            <!-- make it look more like "[ ] > Video    | [ ] > Music   " with equal sites and spacing -->
            <md-radio v-model="format" value="video"><md-icon>play_arrow</md-icon> Video</md-radio> <!-- arrow would maybe look better if it were hollow -->
            <md-radio v-model="format" value="audio"><md-icon>music_note</md-icon> Music</md-radio> <!-- should be double note -->
          </md-list-item>
        </md-list>

        <md-list v-if="format === 'video'">
          <md-subheader :md-disabled="format !== 'video'" class="md-primary">Video Settings</md-subheader>
          <md-list-item>
            <md-field>
              <!-- should have label next to select: "Resolution    [ 1080p ^ ]" -->
              <label for="dlRes">Resolution</label>
              <md-select v-model="dlRes" name="dlRes" id="dlRes">
                <md-option value="1080">1080p</md-option>
              </md-select>
            </md-field>
          </md-list-item>
        </md-list>

        <md-list>
          <md-subheader class="md-primary">Audio Settings</md-subheader>
        </md-list>
      </md-app-content>
    </md-app>
  </div>
</template>

<style lang="scss" scoped>
  /* TODO: use calc for all sizes */

  .dl-btn {
    margin: .25em;
  }

  .url-field {
    background: #00000011;
    border-radius: 6px;
    padding: 4px 16px !important;
    display: flex;
    margin: .25em .5em;
  }

  .m-table {
    display: flex;
    flex-direction: column;
  }
  .m-table > * {
    padding: 1em;
  }

  @media(min-width: 750px) {
    .md-app-content {
      padding: 3em;
      margin: -64px 12em 12em !important;
    }

    .dl-btn {
      margin: .75em;
    }

    .url-field {
      margin: .5em 6em;
    }

    .m-table {
      flex-direction: row;
    }
  }

  .dl-input {

  }

  .md-progress-spinner {
    margin: 24px;
  }
</style>

<script>
const Client = require('../src/client/')(module.hot ? 'http://localhost:5344' : window.location.origin)

export default {
  name: 'app',
  data: () => ({
    isDownloadingMeta: false,
    isMetaView: false,
    meta: {},
    format: '',
    dlRes: '',
    downloads: []
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

      this.$data.format = 'video'
    }
  }
}
</script>
