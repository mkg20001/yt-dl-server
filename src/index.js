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
const Schema = require('./schema')

const fs = require('fs')

const init = async (config) => {
  const {storage, mongodb} = config
  const {Media} = Schema(config)

  mongoose.connect(config.mongodb)

  const mongodbDB = mongodb.split('/').pop().split('?').shift() // get uppercase part: mongodb://url:port/DB?something
  config.hapi.cache = [{
    engine: CatboxMongoDB,
    uri: mongodb,
    partition: mongodbDB
  }]
  config.hapi.routes = {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? [] : ['*'],
      credentials: true
    }
  }

  const server = Hapi.server(config.hapi)

  await server.register({
    plugin: require('hapi-pino'),
    options: {name: 'yt-dl-server'}
  })

  await server.register({
    plugin: require('inert')
  })

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

  server.route({
    method: 'POST',
    path: '/download/queue',
    config: {
      validate: {
        payload: {
          url: Joi.string() // TODO: validate if url valid
          /* quality: {
            video: Joi.string(),  TODO: validate if valid
            audio: Joi.string()
          },
          format: Joi.string() TODO: validate if valid */
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
        await db.save()
        const job = await downloadQueue.add({db: db._id})
        db.jobId = job.id
        await db.save()
      }

      return {
        id: db._id,
        finished: db.isFinished
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/download/status/{dbid}',
    handler: async (request, h) => {
      const db = await Media.findById(request.params.dbid).exec()

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
      const db = await Media.findById(request.params.dbid).exec()

      if (!db) {
        return h.response({error: 'Resource not found'}).code(404)
      }

      if (!db.isFinished) {
        return h.response({error: 'Download didn\'t finish yet', advice: 'GET /download/status/' + db._id})
      }

      const {stored} = db

      if (!fs.existsSync(stored)) {
        await db.delete() // if this is missing then we could as well gc the db entry
        return h.response({error: 'Cached data not found'}).code(404)
      }

      db.downloadedAt = Date.now()
      await db.save()

      // TODO: stream blob to client

      return h.file(stored)
    }
  })

  setInterval(async () => {
    log.info('Starting cleanup')
    const allMedia = await Media.find().exec()
    let space = 0
    const getTS = (e) => e.downloadedAt || e.fetchedAt || e.queuedAt
    await Promise.all([allMedia.sort((a, b) => getTS(a) - getTS(b)).map(async (media) => {
      if (media.isFinished) {
        space += media.size
        if (space > storage.maxSpace) {
          log.info({url: media.url}, 'Deleting %s cached because maxSpace exceeded', media.url)
          await media.delete()
        }
      }
    })])
    log.info('Finished cleanup')
  }, storage.cleanInterval)

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

  downloadQueue.process(w(async (job) => {
    const db = await Media.findById(job.data.db).exec()
    if (!db) {
      return log.warn('Task %s vanished', job.data.db)
    }
    log.info({url: db.url, out: db.stored}, 'Downloading %s', db.url)

    try {
      await ytdl.downloadURL(db.url, {}, db.stored) // TODO: get and set progress
    } catch (e) {
      log.error(e)
      await db.delete()
      return
    }

    db.size = fs.statSync(db.stored).size
    db.fetchedAt = Date.now()
    await db.save()

    log.info({url: db.url, out: db.stored}, 'Downloaded %s', db.url)
  }))

  await server.start()
}

process.on('unhandledRejection', (err) => {
  console.log(err) // eslint-disable-line no-console
  process.exit(1)
})

module.exports = init
