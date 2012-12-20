var f = require('flates')
  , util = require('util')
  , js =
      [ '/js/jquery-1.7.1.min.js'
      , '/js/jquery-ui-1.8.16.custom.min.js'
      , '/js/underscore-min.js'
      , '/client.js'
      ]
  , css =
      [ '/style.css'
      , '/js/jquery-ui-1.8.16.custom.css'
      ]

module.exports = build

function build (pages, loginStatus) {
  // if (!util.isArray(pages)) pages = [{ page: opts.s }]
  return f.d() +
  f.html(
    f.head(
      f.title('SmallestFederatedWiki') +
      f.meta({ content:'text/html; charset=UTF-8', 'http-equiv': 'Content-Type'}) +
      f.meta(
        { content:'width=device-width, height=device-height, initial-scale=1.0, user-scalable=no'
        , name:'viewport'
        }) +
      f.link({ id:'favicon', href:'/favicon.png', rel:'icon', type:'image/png' }) +
      stylesheets(css) +
      scripts(js)
      //f.comment(
      //  'This wiki is served by the SFW node server, the source can be found at' +
      //  'https://github.com/WardCunningham/Smallest-Federated-Wiki' +
      //  '{{gitlog}}'
      //) +
    ) + 
    f.body(
      f.section({ class: 'main' },
        pages.map(function (page) {
          var obj = { class:'page', id: page.page}
          if (page.origin) obj['data-site'] = page.origin
          return f.div(obj)
        }).join('')
      ) +
      f.footer({ class: loginStatus },
        f.form({ action: '/login', method: 'post' },
          'OpenID:' +
          f.input({ name: 'identifier', type: 'text' }) +
          f.input({ type: 'submit', value: loginStatus }) +
          'or use:' +
          f.span({ class: 'provider' },
            f.input(
              { 'data-provider': 'https://www.google.com/accounts/o8/id'
              , title: 'google'
              , type: 'button'
              , value: 'G'
              }
            )
          )
        )
      )
    )
  )
}

function scripts (include) {
  return include.map(function (item) {
    return f.script({ src: item, type: 'application/javascript' })
  }).join('')
}

function stylesheets (include) {
  return include.map(function (item) {
    return f.link({ href: item, rel: 'stylesheet', type: 'text/css' })
  }).join('')
}

