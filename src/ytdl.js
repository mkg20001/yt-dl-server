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
        let e = new Error('Failed with ' + (ex || sig))
        e.cmd = args
        e.stderr = String(p.stderr)
        e.stack += `\n --- YT DL ---\n CMD: ${args.map(JSON.stringify).join(' ')}\n STDERR: \n${e.stderr}\n --- YT DL ---`
        return reject(e)
      }
      resolve(p)
    })
  })
}
