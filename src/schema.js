'use strict'

const mongoose = require('mongoose')

const {Schema} = require('mongoose')

const fs = require('fs')
const path = require('path')

module.exports = (config) => {
  const MediaSchema = new Schema({
    url: { type: String, required: true },
    queuedAt: { type: Date, default: Date.now },
    fetchedAt: { type: Date },
    downloadedAt: { type: Date },
    size: { type: Number },
    headers: { type: Object } // html content headers to set for dl
  })

  MediaSchema.virtual('stored').get(function () {
    return path.join(config.storage.location, this.get('id'))
  })

  MediaSchema.virtual('isFinished').get(function () {
    return Boolean(this.get('fetchedAt'))
  })

  MediaSchema.pre('delete', function (next) {
    const stored = this.get('stored')
    if (fs.existsSync(stored)) {
      fs.unlink(stored, next)
    } else {
      next()
    }
  })

  const Media = mongoose.model('Media', MediaSchema)

  return {Media}
}
