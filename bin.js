#!/usr/bin/env node

'use strict'

const argv = require('yargs')
  .option('host', {
    describe: 'Host to listen on',
    type: 'string',
    default: '::'
  })
  .option('port', {
    describe: 'Port to listen on',
    type: 'number',
    default: 5344
  })
  .option('mongodb', {
    describe: 'MongoDB Url',
    type: 'string',
    default: 'mongodb://localhost/yt-dl-server'
  })
  .option('redis', {
    describe: 'Redis Url',
    type: 'string',
    default: '...'
  })
  .option('space', {
    describe: 'Maximum cache space usage in bytes (def 10GB)',
    type: 'number',
    default: 10 * Math.pow(1024, 3)
  })
  .option('storage', {
    describe: 'Storage location',
    type: 'string',
    default: require('path').join(process.cwd(), 'storage')
  })
  .option('cleanInterval', {
    describe: 'Cleaning interval in ms (def 1h)',
    type: 'number',
    default: 3600 * 1000
  })
  .argv

const config = {
  hapi: {
    port: argv.port,
    host: argv.host
  },
  storage: {
    maxSpace: argv.space,
    location: argv.storage,
    cleanInterval: argv.cleanInterval
  },
  mongodb: argv.mongodb,
  redis: argv.redis
}

const init = require('.')
init(config)
