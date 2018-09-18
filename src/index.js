'use strict'

const Hapi = require('hapi')
const Queue = require('bull')

const downloadQueue = new Queue('youtube-dl')
const server = Hapi.server({
  port: 5344,
  host: 'localhost'
})
const Joi = require('joi')

const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost/yt-dl-server')

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

const init = async () => {
  await server.start()

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
      const downloaded = await Media.findOne(data, cb).exec()

      let db

      if (downloaded) {
        db = downloaded
      } else {
        db = new Media(data)
        db.fetchedAt = Date.now()
        await db.save().exec()
        data.dbId = db._id
        const queueItem = downloadQueue.add(data)
        // TODO: store bull queue id
      }

      return {
        dbId: data._id,
        finished: data.isFinished
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/download/status/{dbid}',
    handler: async (request, h) => {
      const dbId = request.params.dbid
      const db = await Media.findOne({id: dbId}).exec()

      if (!db) {
        // TODO: 404 resp
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
      const dbId = request.params.dbid
      const db = await Media.findOne({id: dbId}).exec()

      if (!db) {
        // TODO: 404 resp
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

init()
