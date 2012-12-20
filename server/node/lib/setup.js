p = require('pasta')()

module.exports = function (req, res) {
  res.e = p.errorHandler(res)
}
