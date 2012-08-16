// Main server module.

var path = require('path')
  , http = require('http')
  , Stream = require('stream')
  , fs = require('fs')
  // dependencies
  , ramrod = require('ramrod')
  , request = require('request')
  , mkdirp = require('mkdirp')
  , ecstatic = require('ecstatic')
  // local modules
  , settings = require('./lib/settings')
  , pageModule = require('./lib/pageModule')
  ;

module.exports = exports = function (opts) {
  var app = http.createServer(handler)

    // Regex routes, emit name and need to be listend to below.
  var routes =
    { 'full': /^((\/[a-zA-Z0-9:.-]+\/[a-z0-9-]+)+)\/?$/
    , 'revd': /^((\/[a-zA-Z0-9:.-]+\/[a-z0-9-]+(_rev\d+)?)+)$/
    , 'factory': /^\/plugins\/factory(\/factory)?.js$/
    , 'data': /^\/data\/([\w -]+)$/
    , 'html': /^\/([a-z0-9-]+)\.html$/
    , 'json': /^\/([a-z0-9-]+)\.json$/
    , 'action': /^\/page\/([a-z0-9-]+)\/action$/
    , 'remotePage': /^\/remote\/([a-zA-Z0-9:\.-]+)\/([a-z0-9-]+)\.json$/
    , 'remoteFalg': /^\/remote\/([a-zA-Z0-9:\.-]+)\/favicon.png$/
    // Other routes will trigger their function
    // Unimlamented routes
    , '/logout' : function (req, res) { res.statusCode = 200;res.end('wtf')}
    , '/login' : notyet
    , '/login/openid/complete' : notyet
    , '/system/slugs.json' : notyet
    , '/favicon.png' : notyet
    , '/random.png' : notyet
    , '/' : index
    , '/system/plugins.json': notyet
    , '/recent-changes.json': notyet
    , '/submit': notyet
    }

  function notyet () {}

  var router = ramrod(routes)

  function handler (req, res) {
    router.dispatch(req, res)
  }

  function index (req, res) {
    res.statusCode = 302
    res.setHeader('location', '/view/' + opts.s)
    res.end()
  }

  opts = settings(opts)

  pageHandler = pageModule(opts)

  router.add('/test', 'test')
  router.on('test', function (req, res) {
    console.log('hmm')
    res.statusCode = 200
    res.end('wtf')
  })

  // router.on('*', ecstatic(opts.c))

  console.log(opts)
  app.listen(opts.p)

  return app
}

