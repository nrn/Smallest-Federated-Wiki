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
  , setup = require('./lib/setup')
  , dispatch = require('./lib/dispatch')
  , settings = require('./lib/settings')
  , pageModule = require('./lib/pageModule')
  , render = require('./lib/render')
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
    , 'remoteFlag': /^\/remote\/([a-zA-Z0-9:\.-]+)\/favicon.png$/
    , 'changes': /^\/(system\/)recent-changes.json/
    // Other routes will trigger their function
    , '' : null
    , 'logout' : notyet
    , 'login' : notyet
    , 'login/openid/complete' : notyet
    , 'favicon.png' : null
    , 'random.png' : notyet
    , 'system/slugs.json' : null
    , 'system/plugins.json': null
    , 'system/sitemap.json': null
    , 'submit': notyet
    }

  var router = ramrod(routes)

  router.on('before', setup)

  router.on('*', ecstatic(opts.c))

  router.on('', redirect('/view/' + opts.s))

  router.on('full', function (req, res, loc) {
    var server, slug, pages = []
    loc = loc.split('/')
    for(var i = 1; i < loc.length; i += 2) {
      server = loc[i]
      slug = loc[i + 1]
      if (server === 'view') pages.push({ page: slug })
      else pages.push({ page: slug, origin: server })
    }
    res.statusCode = 200
    res.end(render(pages))
  })

  router.on('factory', function (req, res) {
    // TODO: make this two requests, for the catalog and factory.
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

  router.on('json', dispatch(
    { 'GET': function (req, res, slug) { pageHandler(slug).pipe(res) }
    }
  ))

  var favicon = { 'GET': ecstatic(opts.stat) }
  router.on('favicon.png', dispatch(favicon))

  // SYSTEM routes
  router.on('changes', notyet)

  router.on('system/sitemap.json', notyet)

  router.on('system/slugs.json', function (req, res) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    glob(opts.db + '/**', function (e, files) {
      files = files.map(function (file) {
        return path.basename(file)
      })
      res.end(JSON.stringify(files, null, 2))
    })
  })

  router.on('system/plugins.json', function (req, res) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    var pluginDir = opts.c + '/plugins'
    glob(pluginDir + '/*/', function (e, files) {
      files = files.map(function (file) {
        return path.relative(pluginDir, file)
      })
      res.end(JSON.stringify(files, null, 2))
    })
  })


  // REMOTE routes
  router.on('remotePage', function (req, res, server, slug) {
    request.get('http://' + server + '/' + slug + '.json').pipe(res)
  })

  router.on('remoteFlag', function (req, res, server) {
    request.get('http://' + server + '/favicon.png').pipe(res)
  })


  router.on('revd', notyet)
  router.on('data', notyet)
  router.on('html', notyet)
  router.on('action', notyet)


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

