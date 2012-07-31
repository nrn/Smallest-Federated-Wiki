// Main server module.

var path = require('path')
  , Stream = require('stream').Stream
  , fs = require('fs')
  // dependencies
  , tako = require('tako')
  , request = require('request')
  , filed = require('filed')
  , es = require('event-stream')
  , mkdirp = require('mkdirp')
  // local modules
  , settings = require('./lib/settings')
  , pageModule = require('./lib/pageModule')
  ;

var doAction = function (action) {
  // TODO: Actually make this work.
  // Return stream objects instead of callbacks?
  var a =
    { move: function (e, story) {
        return action.order.map(function (id) {
          return story.filter(function (item) {
            return item.id === id
          })[0]
        })
      }
    , add: function (e, story) {
        var before
        story.forEach(function (item, idx, all) {
          if (item.id === action.after) before = 1 + idx
        })
        return story.splice(before, 0, action.item)
      }
    , remove: function (e, story) {
        return story.filter(function (item) {
          if (item.id === action.id) return false
          return true
        })
      }
    , edit: function (e, story) {
        return story.map(function (item) {
          if (item.id === action.id) return action.item
          return item
        })
      }
    , create: function (e, story) {
        if (!story) story = []
        return story
      }
    , _default: function (e, story) {
        console.log('Unfamiliar action: ' + action)
        return story
      }
    }
  if (a.hasOwnProperty(action.type)) return a[action.type]
  return a._default
}

module.exports = exports = function (opts) {
  var app = tako()
    , index = app.page()
    , findPage
    , pageHandler

  app.router.fifo = true

  opts = settings(opts)


  pageHandler = pageModule(opts)

  app.templates.directory(path.join(opts.r, 'server/node/views'))

  app.route('/', function (req, res) {
    res.statusCode = 302
    res.setHeader('location', 'http://' + req.headers.host + '/view/' + opts.s)
    res.end()
  })

  app.route('/plugins/factory.js', function (req, res) {
    var catalog = 'window.catalog = ' + JSON.stringify(
        { ByteBeat: { menu: '8-bit Music by Formula' }
        , MathJax: { menu: 'TeX Formatted Equations' }
        , Caculator: { menu: 'Running Sums for Expenses' }
        }, null, 2)
      , f = filed(opts.c + '/plugins/meta-factory.js')

    res.realEnd = res.end
    res.end = function (chunk) {
      if (!chunk) chunk = ''
      this.realEnd(chunk + catalog)
    }

    f.pipe(res)

  })

  app.route('/remote/:site/:slug.json').json(function (req, res) {
    request('http://' + req.params.site + '/' + req.params.slug + '.json').pipe(res)
  })

  app.route('page/:slug/action', function (req, res) {
    // req.on('body', function (body) {
    //   var action = body.action
    //   pageHander(req.params.slug, doAction(action))
    // })
    res.end('ok')
  }).methods('PUT')

  app.route(/^((\/[a-zA-Z0-9:.-]+\/[a-z0-9-]+)+)\/?$/).html(function (req, res) {
    var info = { pages: [] }

    req.pathname.split('/').forEach(function (item, idx, all) {
      var page
      if (idx === 0) return
      if (idx/2 === Math.floor(idx/2)) {
        page = { page: item }
        if (all[idx - 1] !== 'view') page.origin = 'data-site=' + all[idx-1]
        console.log(page)
        info.pages.push(page)
      }
    })

    index.pipe(res)
    index.results = info
    index.template('static.html')

  }).methods('GET')

  app.route('/:slug.json').json(function (req, res) {
    pageHandler(req.params.slug).pipe(res)
  }).methods('GET')

  app.route('/favicon.png', function (req, res) {
    var strip = es.mapSync(function (data, cb) {
      return data.toString().replace(/^data:image\/png;base64,/, "")
    })

    req.pipe(filed(path.join(opts.stat, '/favicon.png'))).pipe(res)

    //req.pipe(strip).pipe(filed(path.join(opts.stat, '/favicon.png'))).on('end', function () {
    //  res.end('ok')
    //})
  })

  app.route('/*', function (req, res) {
    filed(path.join(opts.c, req.pathname)).pipe(res)
  }).methods('GET')

  app.httpServer.listen(opts.p)

  // console.log(app.router.root.children)

  console.log(opts)

  return app
}

