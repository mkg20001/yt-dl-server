'use strict'

const cp = require('child_process')
const bl = require('bl')
module.exports = (...args) => {
  return new Promise((resolve, reject) => {
    const p = cp.spawn('youtube-dl', args, {stdio: 'pipe'})
    p.once('error', reject)
    let out = bl()
    let err = bl()
    p.stdout.pipe(out)
    p.stdout = bl
    p.stderr.pipe(err)
    p.stderr = err
    p.once('close', (ex, sig) => {
      if (ex || sig) {
        return reject(new Error('Failed with ' + (ex || sig)))
      }
      resolve(p)
    })
  })
}
