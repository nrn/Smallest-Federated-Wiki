// Settings and Defaults

var path = require('path')

module.exports = exports = function (opts) {

  if (typeof opts === 'number') opts = {p: opts}
  if (!opts) opts = {}
  if (!opts.o) opts.o = ''
  if (!opts.p) opts.p = 3333
  if (!opts.r) opts.r = path.join(__dirname, '..', '..', '..')
  if (!opts.d) opts.d = path.join(opts.r, 'data')
  if (!opts.c) opts.c = path.join(opts.r, 'client')
  if (!opts.db) opts.db = path.join(opts.d, 'pages')
  if (!opts.stat) opts.stat = path.join(opts.d, 'status')
  if (!opts.u) opts.u = 'http://localhost' + ((opts.p === 80) ? '' : ':' + opts.p)
  if (!opts.s) opts.s = 'welcome-visitors'
  if (!opts.id) opts.id = path.join(opts.stat, 'open_id.identify')
  return opts
}

