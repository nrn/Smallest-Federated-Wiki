var path = require('path')
  , fs = require('fs')
  // deps
  , filed = require('filed')

function pageModule (opts) {

  function pageHandler (slug, cb) {
    var res
      , handler = {}
      , loc = path.join(opts.db, slug)
      , defloc = path.join(opts.r, 'default-data', 'pages', slug)
      , plugindir = path.join(opts.r, 'client', 'plugins')
      , started = false

    function start (foundLoc) {
      if (started) return
      started = true
      if (cb) filed(foundLoc, cb)
      else filed(foundLoc).pipe(res)
    }

    function check (loc, doh) {
      return function (exists) {
        if (exists) start(loc)
        else doh()
      }
    }

    path.exists(loc, check(loc, function () {
      path.exists(defloc, check(defloc, function () {
        fs.readdir(plugindir, function (err, folders) {
          folders.forEach(function (file, idx, whole) {
            var pluginloc = path.join(plugindir, file, 'pages', slug)
            path.exists(pluginloc, check(pluginloc, function () {
              if (idx === (whole.length - 1)) start(loc)
            }))
          })
        })
      }))
    }))

    handler.pipe = function (dest) {
      res = dest
      return dest
    }

    return handler
  }

  return pageHandler
}

module.exports = pageModule

