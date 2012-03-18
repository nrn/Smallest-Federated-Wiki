window.plugins.mathjax =
  scripts: ["http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML"]
  emit: (div, item) ->
    div.append "<p>#{wiki.resolveLinks(item.text)}</p>"
    window.MathJax.Hub.Config skipStartupTypeset: true
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, div.get(0)])
  bind: (div, item) ->
    div.dblclick -> wiki.textEditor div, item
