'use strict'

function getFetch () {
  if (process.toString() === '[object process]') {
    return require('node-fetch')
  }
  if (!window.fetch) {
    require('node-fetch') // going to be replaced by whatwg-fetch
  }
  return window.fetch
}

const fetch = getFetch()
const base64 = require('urlsafe-base64')

module.exports = (url) => {
  function downloadById (id) {
    return {
      id,
      status: async () => {
        let res = await fetch(url + '/download/status/' + id)
        res = await res.json()

        return res
      },
      download: async () => {
        let res = await fetch(url + '/download/' + id)
        return res
      }
    }
  }

  return {
    metadata: async (url) => {
      while (true) {
        let data = await fetch(url + '/meta/' + base64.encode(Buffer.from(url)))
        data = await data.json()
        if (data.done) {
          return data
        }
      }
    },
    download: async (url) => {
      let res = await fetch(url + '/download/queue', {
        method: 'POST',
        body: url
      })
      res = await res.json()
      const {id} = res

      return downloadById(id)
    },
    downloadById
  }
}
