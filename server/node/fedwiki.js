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
  , glob = require('glob')
  , es = require('event-stream')
  , JSONStream = require('JSONStream')
  // local modules
  , setup = require('./setup')
  , settings = require('./lib/settings')
  , pageModule = require('./lib/pageModule')
  , render = require('./render')
  ;

module.exports = exports = function (opts) {
  var app = http.createServer(handler)

  opts = settings(opts)

  var pageHandler = pageModule(opts)

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
    , '' : redirect('/view/' + opts.s)
    , 'logout' : notyet
    , 'login' : notyet
    , 'login/openid/complete' : notyet
    , 'system/slugs.json' : notyet
    , 'favicon.png' : notyet
    , 'random.png' : notyet
    , 'system/plugins.json': notyet
    , 'recent-changes.json': notyet
    , 'submit': notyet
    }

  var router = ramrod(routes)

  router.on('before', setup)

  router.on('*', ecstatic(opts.c))

  router.on('full', function (req, res) {
    res.statusCode = 200
    res.end(render([{ page: opts.s }]))
  })

  router.on('factory', function (req, res) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/javascript')
    function cb (e, catalog) {
      if (e) throw e
      res.write('window.catalog = ' + JSON.stringify(catalog) + ';')
      fs.createReadStream(opts.c + '/plugins/meta-factory.js').pipe(res)
    }
    glob(opts.c + '/**/factory.json', function (e, files) {
      if (e) return cb(e)
      files = files.map(function (file) {
        return fs.createReadStream(file).pipe(
          JSONStream.parse(false).on('root', function (el) { this.emit('data', el) })
        )
      })
      es.concat.apply(null, files).pipe(es.writeArray(cb))
    })
  })

  router.on('json', function (req, res) {
    console.log(req.url)
    pageHandler('welcome-visitors').pipe(res)
  })

  router.on('revd', notyet)
  router.on('data', notyet)
  router.on('html', notyet)
  router.on('action', notyet)
  router.on('remotePage', notyet)
  router.on('remoteFalg', notyet)


  function notyet (req, res) {
    console.log('You called a route that is not yet implemented')
    res.statusCode = 404
    res.end('not found')
  }


  function handler (req, res) {
    router.dispatch(req, res)
  }

  function redirect (loc) {
    return function (req, res) {
      res.statusCode = 302
      res.setHeader('location', loc)
      res.end()
    }
  }

  console.log(opts)
  app.listen(opts.p)

  return app
}

