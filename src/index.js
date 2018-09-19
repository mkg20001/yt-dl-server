'use strict'

const Hapi = require('hapi')
const Queue = require('bull')
const CatboxMongoDB = require('catbox-mongodb')

const downloadQueue = new Queue('youtube-dl')
const metaQueue = new Queue('youtube-dl-meta')
const Joi = require('joi')

const wait = i => new Promise((resolve, reject) => setTimeout(resolve, i))
const base64 = require('urlsafe-base64')
const ytdl = require('./ytdl')

const pino = require('pino')
const log = pino({name: 'yt-dl-server'})
const w = (fnc) => (job, done) => fnc(job).then(r => done(r), done)

const mongoose = require('mongoose')

const {Schema} = require('mongoose')

const MediaSchema = new Schema({
  url: { type: String, required: true },
  quality: {
    video: { type: String, required: true },
    audio: { type: String, required: true }
  },
  format: { type: String, required: true },
  fetchedAt: { type: Date, default: Date.now }
})
const Media = mongoose.model('Media', MediaSchema)

const init = async (config) => {
  mongoose.connect(config.mongodb, {useNewUrlParser: true})

  config.hapi.cache = [{
    name: 'mongoDbCache',
    engine: CatboxMongoDB,
    uri: config.mongodb,
    partition: config.mongodb.split('/').pop().split('?').shift()
  }]

  const server = Hapi.server(config.hapi)
  await server.start()

  const metaCache = server.cache({segment: 'metadata', expiresIn: 3600 * 1000})
  server.route({
    method: 'GET',
    path: '/meta/{id}',
    config: {
      validate: {
        params: {
          id: Joi.string()
        }
      }
    },
    handler: async (request, h) => {
      const url = String(base64.decode(request.params.id))
      let i = 5
      while (i--) {
        const cached = await metaCache.get(url)
        if (!cached) { // scheudle cache fetch
          log.info({url}, 'Queue metadata download for %s', url)
          let job = await metaQueue.add({url})
          metaCache.set(url, {wip: job.id})
        } else if (cached.wip) {
          if (i) {
            await wait(1000)
          }
        } else {
          cached.done = true
          return cached
        }
      }

      return {done: false}
    }
  })
  metaQueue.process(w(async (job) => {
    const {url} = job.data
    log.info({url}, 'Downloading metadata for %s', url)
    try {
      await metaCache.set(url, await ytdl.getMetadata(url))
      log.info({url}, 'Metadata download for %s succeeded', url)
    } catch (e) {
      e.url = url
      log.error(e, 'Metadata download for %s failed', url)
      await metaCache.set(url, {error: true})
      return {}
    }
  }))

  server.route({
    method: 'POST',
    path: '/download/queue',
    config: {
      validate: {
        payload: {
          url: Joi.string(), // TODO: validate if url valid
          quality: {
            video: Joi.string(), // TODO: validate if valid
            audio: Joi.string()
          },
          format: Joi.string() // TODO: validate if valid
        }
      }
    },
    handler: async (request, h) => {
      const data = request.payload
      const downloaded = await Media.findOne(data).exec()

      let db

      if (downloaded) {
        db = downloaded
      } else {
        db = new Media(data)
        await db.save().exec()
        data.dbId = db._id
        const job = await downloadQueue.add(data)
        db.jobId = job.id
      }

      return {
        id: data._id,
        finished: db.isFinished
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/download/status/{dbid}',
    handler: async (request, h) => {
      const db = await Media.findOne({id: request.params.dbid}).exec()

      if (!db) {
        return h.response({error: 'Resource not found'}).code(404)
      }

      if (db.isFinished) {
        return {
          finished: true,
          progress: 1
        }
      }

      // TODO: fetch progress from bull queue id
      let progress = 0
      return {
        finished: false,
        progress
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/download/{dbid}',
    handler: async (request, h) => {
      const db = await Media.findOne({id: request.params.dbid}).exec()

      if (!db) {
        return h.response({error: 'Resource not found'}).code(404)
      }

      // TODO: stream blob to client
    }
  })

  console.log(`Server running at: ${server.info.uri}`)
}

process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})

module.exports = init
