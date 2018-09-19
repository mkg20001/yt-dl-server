'use strict'

const cp = require('child_process')
const bl = require('bl')
const tmp = require('./tmp')
const fs = require('fs')
const assert = require('assert')
const path = require('path')

const debug = require('debug')
const log = debug('yt-dl-server:youtube-dl')

const ytdl = module.exports = (...args) => {
  return tmp().then(tmpDir => new Promise((resolve, reject) => {
    tmpDir.searchForExt = (ext) => {
      let filesWithExt = fs.readdirSync(tmpDir.path).filter(name => name.endsWith('.' + ext))
      try {
        assert(filesWithExt.length === 1, 'File with ext ' + ext + ' not found')
      } catch (e) {
        throw p.debugErr(e)
      }
      return path.join(tmpDir.path, filesWithExt[0])
    }

    const cpArgs = ['youtube-dl', args, {stdio: 'pipe', cwd: tmpDir.path}]

    log('running ytdl: %o', cpArgs)

    const p = cp.spawn(...cpArgs)
    p.once('error', reject)
    p.tmp = tmpDir

    let out = bl()
    let err = bl()
    p.stdout.pipe(out)
    p.stdout = out
    p.stderr.pipe(err)
    p.stderr = err

    p.cleanup = () => {
      return p.tmp.cleanup()
    }

    p.debugErr = (e) => {
      e.cmd = args
      e.stderr = String(p.stderr)
      e.stdout = String(p.stdout)
      e.stack += `\n --- YT DL ---\n CMD: ${args.map(JSON.stringify).join(' ')}\n STDERR: \n${e.stderr}\n STDOUT: \n${e.stdout}\n --- YT DL ---`
      log('error', e)
      return e
    }

    p.once('close', (ex, sig) => {
      if (ex || sig) {
        let e = new Error('Failed with ' + (ex || sig))
        p.cleanup()
        return reject(p.debugErr(e))
      }
      resolve(p)
    })
  }))
}

const fmtTable = [
  ['code', 13, s => parseInt(s.trim(), 10)],
  ['ext', 11, s => s.trim()],
  ['res', 11, s => s.trim()],
  ['note', 100, s => s]
]

ytdl.getMetadata = async (url) => {
  const out = await ytdl('--write-info-json', '--skip-download', url)

  const infoJson = out.tmp.searchForExt('info.json')
  const meta = JSON.parse(String(fs.readFileSync(infoJson)))
  meta.formatsParsed = await ytdl.parseFormatsInInfoJSON(url, infoJson)

  out.cleanup()

  return meta
}

ytdl.parseFormatsInInfoJSON = async (url, infoJson) => {
  const out = await ytdl('--list-formats', url, '--load-info-json', infoJson)
  out.cleanup()
  const log = String(out.stdout)
  if (log.indexOf('format code') === -1) {
    throw out.debugErr(new Error('Format code not found in table'))
  }

  let f = false
  let data = log.split('\n').filter(l => {
    if (l.startsWith('format code')) {
      f = true
    } else if (f && l.trim()) {
      return true
    }
  }).map(l => {
    let out = {}
    fmtTable.forEach(col => {
      out[col[0]] = col[2](l.substr(0, col[1]))
      l = l.substr(col[1])
    })
    return out
  })

  return data
}
