(function() {
  var typeset;

  typeset = function(div) {
    return $(div).each(function() {
      return MathJax.Hub.Queue(["Typeset", MathJax.Hub, this]);
    });
  };

  window.plugins.mathjax = {
    scripts: ["http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML"],
    init: function() {
      return window.MathJax.Hub.Config({
        skipStartupTypeset: true
      });
    },
    emit: function(div, item) {
      div.append("<p>" + (wiki.resolveLinks(item.text)) + "</p>");
      return typeset(div);
    },
    bind: function(div, item) {
      return div.dblclick(function() {
        return wiki.textEditor(div, item);
      });
    }
  };

}).call(this);
