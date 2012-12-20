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
  , filed = require('filed')
  , Pasta = require('pasta')
  // local modules
  , setup = require('./lib/setup')
//  , dispatch = require('./lib/dispatch')
  , settings = require('./lib/settings')
  , pageModule = require('./lib/pageModule')
  , render = require('./lib/render')

module.exports = exports = function (opts) {
  var app = http.createServer(handler)

  opts = settings(opts)

  var pageHandler = pageModule(opts)

  var p = Pasta()

  // The key is the event that router emits when the route matches
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
    , '' : null
    , 'logout' : null
    , 'login' : null
    , 'login/openid/complete' : null
    , 'favicon.png' : null
    , 'random.png' : null
    , 'system/slugs.json' : null
    , 'system/plugins.json': null
    , 'system/sitemap.json': null
    , 'submit': null
    }

  var router = ramrod(routes)

  router.on('before', setup)

  router.on('*', ecstatic(opts.c))

  router.on('', p.redirect('/view/' + opts.s))

  router.on('revd', p.notyet)
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
      if (e) return res.e(e)
      res.write('window.catalog = ' + JSON.stringify(catalog) + ';')
      fs.createReadStream(opts.c + '/plugins/meta-factory.js').pipe(res)
    }
    glob(opts.c + '/**/factory.json', function (e, files) {
      if (e) return cb(e)
      files = files.map(function (file) {
        return fs.createReadStream(file).on('error', res.e).pipe(
          JSONStream.parse(false).on('root', function (el) { this.emit('data', el) })
        )
      })
      es.concat.apply(null, files)
        .on('error', res.e)
        .pipe(es.writeArray(cb))
    })
  })

  router.on('json', p.dispatch(
    { 'GET': function (req, res, slug) { pageHandler(slug).pipe(res) }
    }
  ))

  var favicon = { 'GET': ecstatic(opts.stat) }
  router.on('favicon.png', p.dispatch(favicon))
  router.on('random.png', p.notyet)

  // SYSTEM routes
  router.on('changes', p.notyet)

  router.on('system/sitemap.json', p.jsonCORS)
  router.on('system/sitemap.json', function (req, res) {
    function cb (e, sitemap) {
      if (e) return res.e(e)
      res.end(JSON.stringify(sitemap, null, 2))
    }

    glob(opts.db + '/**', function (e, files) {
      files = files.map(function (file) {
        var stream = filed(file)
        stream.on('error', res.e)
        return stream.pipe(
          JSONStream.parse(false).on('root', function (el) { this.emit('data', { slug: file, title: el.title })})
        )
      })
      es.concat.apply(null, files).pipe(es.writeArray(cb))
    })
  })

  router.on('system/plugins.json', p.jsonCORS)
  router.on('system/slugs.json', function (req, res) {
    pageHandler.list(function (e, files) {
      res.end(JSON.stringify(files, null, 2))
    })
  })

  router.on('system/plugins.json', p.jsonCORS)
  router.on('system/plugins.json', function (req, res) {
    var pluginDir = opts.c + '/plugins'
    glob(pluginDir + '/*/', function (e, files) {
      files = files.map(function (file) {
        return path.relative(pluginDir, file)
      })
      res.end(JSON.stringify(files, null, 2))
    })
  })

  // ACTION handler
  router.on('action', function (req, res, slug) {
  })

  // REMOTE routes
  router.on('remotePage', function (req, res, server, slug) {
    request.get('http://' + server + '/' + slug + '.json').pipe(res)
  })

  router.on('remoteFlag', function (req, res, server) {
    request.get('http://' + server + '/favicon.png').pipe(res)
  })

  router.on('data', p.notyet)
  router.on('html', p.notyet)
  router.on('submit', p.notyet)
  router.on('logout', p.notyet)
  router.on('login', p.notyet)
  router.on('login/openid/complete', p.notyet)

  function handler (req, res) {
    router.dispatch(req, res)
  }

  p.l(opts)
  app.listen(opts.p)

  return app
}

