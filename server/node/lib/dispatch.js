module.exports = dispatch

function def (req, res, allowed) {
  res.statusCode = 405
  res.setHeader('Allow', allowed)
  res.end('Method Not Allowed')
}

function dispatch (methods) {
  return function (req, res) {
    var intended = methods[req.method]
    if (typeof intended === 'function') return intended.apply(null, arguments)
    var _default = methods[_default]
    if (typeof _default === 'function') return _default.apply(null, arguments)
    return def(req, res, Object.keys(methods))
  }
}

