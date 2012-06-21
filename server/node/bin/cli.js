#!/usr/bin/env node

var path = require('path')
  , optimist = require('optimist')
  , server = require('../fedwiki')
  , bouncy = require('bouncy')
  , argv
  ;

argv = optimist.usage('Usage: $0').options('u', {
  alias: 'url',
  "default": '',
  describe: 'Important: Your server URL for use with openID'
}).options('p', {
  alias: 'port',
  describe: 'Port'
}).options('d', {
  alias: 'data',
  "default": '',
  describe: 'location of flat file data'
}).options('r', {
  alias: 'root',
  "default": path.join(__dirname, '..', '..', '..'),
  describe: 'Application root folder'
}).options('f', {
  alias: 'farm',
  boolean: true,
  describe: 'Turn on the farm?'
}).options('F', {
  alias: 'FarmPort',
  "default": 40000,
  describe: 'Port to start farm servers on.'
}).options('s', {
  alias: 'startSlug',
  describe: 'The page to go to instead of index.html'
}).options('o', {
  alias: 'host',
  "default": '',
  describe: 'Host to accept connections on, falsy == any'
}).options('id', {
  describe: 'Set the location of the open id file'
}).options('test', {
  boolean: true,
  describe: 'Set server to work with the rspec integration tests'
}).options('h', {
  alias: 'help',
  boolean: true,
  describe: 'Show this help info and exit'
}).argv

if (argv.h) {
  optimist.showHelp()
} else if (argv.test) {
  console.log("WARNING: Server started in testing mode, other options ignored")
  server({
    p: 33333,
    d: path.join(argv.r, 'spec', 'data')
  })
} else {
  server(argv)
}
