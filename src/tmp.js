'use strict'

const tmpDir = require('os').tmpdir()
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const prom = require('promisify-es6')
const mkdir = prom(require('mkdirp'))
const rimraf = prom(require('rimraf'))

module.exports = async () => {
  let dir
  while (!dir || fs.existsSync(dir)) {
    dir = path.join(tmpDir, 'yt-dl-server', crypto.randomBytes(8).toString('hex'))
  }
  await mkdir(dir, parseInt('777', 8))
  return {
    path: dir,
    cleanup: () => rimraf(dir)
  }
}
