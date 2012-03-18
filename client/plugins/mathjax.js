(function() {

  window.plugins.mathjax = {
    scripts: ["http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML"],
    emit: function(div, item) {
      div.append("<p>" + (wiki.resolveLinks(item.text)) + "</p>");
      window.MathJax.Hub.Config({
        skipStartupTypeset: true
      });
      return MathJax.Hub.Queue(["Typeset", MathJax.Hub, div.get(0)]);
    },
    bind: function(div, item) {
      return div.dblclick(function() {
        return wiki.textEditor(div, item);
      });
    }
  };

}).call(this);
