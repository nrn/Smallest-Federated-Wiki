// Server http tests.

var qs = require('querystring')
  , cp = require('child_process')
  , test = require('tap').test
  , request = require('request')
  , server = require('../fedwiki')
  , serverE = require('../../express/index.js')
  ;

test('Routes', function (t) {
  var servers =
      [ { name: 'tako'
        , url: 'http://localhost:7357'
        , server: server({p: 7357, d: '/tmp/fedwiki/tako'})
        }
      , { name: 'express'
        , url: 'http://localhost:7358'
        , server: serverE({p: 7358, d: '/tmp/fedwiki/express'})
        }
      ]
    // this variable is incremented for each test that is added 
    , tests = 0

  servers.forEach(function (info) {
    var url = info.url
      , n = info.name + ': '
      , loc = '/'
      , action = {}
      , simple = []
      , actions = []
      ;

    function check (reg, url) {
      tests += 2
      return function (e, r, body) {
        if (e) throw e
        t.equal(r.statusCode, 200, n + url + ' status')
        t.ok(body.match(reg), n + url + ' body')
      }
    }

    // Simple tests that check for a status code 200 at a path, and makes sure
    // that the regex matches in the body.  Tests are labled with the server
    // name, path, and which test failed.
    simple =
      [ { loc: '/',  reg: /welcome-visitors/ }
      , { loc: '/view/welcome-visitors', reg: /welcome-visitors/ }
      , { loc: '/view/welcome-visitors/view/indie-web-camp', reg: /welcome-visitors/ }
      , { loc: '/client.js', reg: /context = \['origin'\]/ }
      , { loc: '/plugins/factory.js', reg: /window.catalog = {/ }
      , { loc: '/plugins/mathjax/mathjax.js', reg: /window.plugins.mathjax/ }
      , { loc: '/welcome-visitors.json', reg: /Welcome Visitors/ }
      , { loc: '/typeset-math.json', reg: /Typeset Math/ }
      // TODO: don't hit a real remote server
      , { loc: '/remote/nrn.io/welcome-visitors.json', reg: /Welcome Visitors/ }
      , { loc: '/js/underscore-min.js', reg: /\/\/ Underscore/ }
      ]

    simple.forEach(function (s) {
      request({url: url + s.loc}, check(s.reg, s.loc))
    })

    loc = '/na.json'
    tests += 2
    request({url: url + loc}, function (e, r, body) {
      if (e) throw e
      t.equal(r.statusCode, 404, n + loc + 'status')
      t.ok(body.match(/Not Found/i), n + loc + 'body')
    })

    tests += 2
    request({url: url, followRedirect: false}, function (e, r, body) {
      if (e) throw e
      t.equal(r.header('location'), url +  '/view/welcome-visitors', n + '/ redirect header')
      t.equal(r.statusCode, 302, n + '/ redirect status')
    })

    // request({url: url + '/favicon.png'}, function (e, r, body) {
    //   if (e) throw e
    //   t.equal(r.statusCode, 404, n + '/favicon.png status')
    // })

    // Action related routes, not working yet
    function actOpts (action, loc) {
      return { url: url + loc
             , method: 'PUT'
             , form: { action: qs.stringify(action) }
             }
    }

    actions =
      [ { loc: '/page/blah-blah/action'
        , action:
          { type: 'create'
          , id: '1'
          , item: { title: 'Blah Blah' }
          }
        }
      , { loc: '/page/blah-blah/action'
        , action:
          { type: 'add'
          , id: '2'
          , item: { type: 'factory', id: '2' }
          }
        }
      , { loc: '/page/blah-blah/action'
        , action:
          { type: 'edit'
          , id: '2'
          , item: { type: 'paragraph', id: '2', text: 'test' }
          }
        }
      , { loc: '/page/blah-blah/action'
        , action:
          { type: 'add'
          , id: '3'
          , item: { type: 'factory', id: '3' }
          }
        }
      , { loc: '/page/blah-blah/action'
        , action:
          { type: 'move'
          , id: '3'
          , order: [ '3', '2' ]
          }
        }
      , { loc: '/page/blah-blah/action'
        , action:
          { type: 'remove'
          , id: '3'
          }
        }
      ]

    actions.forEach(function (s) {
      request(actOpts(s.action, s.loc), check(/ok/i, s.loc))
    })

  })

  t.plan(tests)

  t.on('end', function () {
    cp.exec('rm -r /tmp/fedwiki')
    servers.forEach(function (server) {
      server.server.close()
    })
  })
})

