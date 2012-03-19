typeset = (div) ->
  $(div).each -> MathJax.Hub.Queue(["Typeset", MathJax.Hub, @])

window.plugins.mathjax =
  scripts: ["http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML"]
  init: ->
    window.MathJax.Hub.Config skipStartupTypeset: true
  emit: (div, item) ->
    div.append "<p>#{wiki.resolveLinks(item.text)}</p>"
    typeset(div)
  bind: (div, item) ->
    div.dblclick -> wiki.textEditor div, item
