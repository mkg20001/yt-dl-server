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
  .argv

const config = {
  hapi: {
    port: argv.port,
    host: argv.host
  },
  mongodb: argv.mongodb,
  redis: argv.redis
}

const init = require('.')
init(config)
