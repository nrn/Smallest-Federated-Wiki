Array::last = ->
  this[@length - 1]

# The root wiki object.
wiki = window.wiki = {}

# Utility FUNCTIONS, to be moved to their own file
randomByte = wiki.randomByte = ->
  (((1+Math.random())*0x100)|0).toString(16).substring(1)

randomBytes = wiki.randomBytes = (n) ->
  (randomByte() for [1..n]).join('')

wiki.log = (things...) ->
  console.log things if console?.log?

resolveFrom = wiki.resolveFrom = (addition, callback) ->
  wiki.resolutionContext.push addition
  try
    callback()
  finally
    wiki.resolutionContext.pop()

asSlug = wiki.asSlug = (name) ->
    name.replace(/\s/g, '-').replace(/[^A-Za-z0-9-]/g, '').toLowerCase()

pageToJson = wiki.pageToJson = (element) ->
  return {
    title: element.dataDash('title')[0]
    story: element.children('.story').children().dataDash()
    journal: element.children('.journal').children().dataDash()
  }


# FUNCTIONS for finding the current state of pages and locations in the
# URL or DOM

pagesInDom = wiki.pagesInDom = ->
  $('.page').dataDash('slug')

urlPages = wiki.urlPages= ->
  (i for i in $(location).attr('pathname').split('/') by 2)[1..]

locsInDom = wiki.locsInDom = ->
  $('.page').dataDash('site')

urlLocs = wiki.urlLocs = ->
  (j for j in $(location).attr('pathname').split('/')[1..] by 2)

createPage = wiki.createPage = (slug, site) ->
  if site and (site isnt ('view' or 'my'))
    $("<div/>").dataDash({site, slug}).addClass("page")
  else
    $("<div/>").addClass("page").dataDash({slug})

# FUNCTIONS used by plugins and elsewhere

resolveLinks = wiki.resolveLinks = (string) ->
  renderInternalLink = (match, name) ->
    # spaces become 'slugs', non-alpha-num get removed
    slug = asSlug name
    wiki.log 'resolve', slug, 'context', wiki.resolutionContext.join(' => ')
    "<a class=\"internal\" href=\"/#{slug}.html\" data-page-name=\"#{slug}\" title=\"#{wiki.resolutionContext.join(' => ')}\">#{name}</a>"
  string
    .replace(/\[\[([^\]]+)\]\]/gi, renderInternalLink)
    .replace(/\[(http.*?) (.*?)\]/gi, "<a class=\"external\" target=\"_blank\" href=\"$1\">$2</a>")

addToJournal = wiki.addToJournal = (journalElement, action) ->
  pageElement = journalElement.parents('.page:first')
  actionElement = $("<a href=\"\#\" /> ").addClass("action").addClass(action.type)
    .text(action.type[0])
    .dataDash(action)
    .appendTo(journalElement)
  if action.type == 'fork'
    actionElement
      .css("background-image", "url(//#{action.site}/favicon.png)")
      .attr("href", "//#{action.site}/#{pageElement.dataDash('slug')[0]}.html")
      .dataDash("site", action.site)
      .dataDash("slug", pageElement.dataDash('slug')[0])

putAction = wiki.putAction = (pageElement, action) ->
  if (site = pageElement.dataDash('site')[0])?
    action.fork = site
    pageElement.find('h1 img').attr('src', '/favicon.png')
    pageElement.find('h1 a').attr('href', '/')
    pageElement.dataDash('site', null)
    wiki.setUrl()
    addToJournal pageElement.find('.journal'),
      type: 'fork'
      site: site
      id: 0
  if wiki.useLocalStorage()
    pushToLocal(pageElement, action)
    pageElement.addClass("local")
  else
    pushToServer(pageElement, action)

pushToLocal = wiki.pushToLocal =  (pageElement, action) ->
  page = action.item if action.type == 'create'
  addToJournal pageElement.find('.journal'), action
  page ||= pageToJson(pageElement)
  page.journal = [] unless page.journal?
  localStorage[pageElement.dataDash('slug')[0]] = JSON.stringify(page)

pushToServer = wiki.pushToServer = (pageElement, action) ->
  $.ajax
    type: 'PUT'
    url: "/page/#{pageElement.dataDash('slug')[0]}/action"
    data:
      'action': JSON.stringify(action)
    success: () ->
      addToJournal pageElement.find('.journal'), action
    error: (xhr, type, msg) ->
      wiki.log "ajax error callback", type, msg

textEditor = wiki.textEditor = (div, item) ->
  textarea = $("<textarea>#{original = item.text ? ''}</textarea>")
    .focusout ->
      if item.text = textarea.val()
        doPlugin div.empty(), item
        return if item.text == original
        putAction div.parents('.page:first'), {type: 'edit', id: item.id, item: item}
      else
        putAction div.parents('.page:first'), {type: 'remove', id: item.id}
        div.remove()
      null
    .bind 'keydown', (e) ->
      if (e.altKey || e.ctlKey || e.metaKey) and e.which == 83 #alt-s
        textarea.focusout()
        return false
    .bind 'dblclick', (e) ->
      return false; #don't pass dblclick on to the div, as it'll reload

  div.html textarea
  textarea.focus()

formatTime = wiki.formatTime = (time) ->
  d = new Date (if time > 10000000000 then time else time*1000)
  mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]
  h = d.getHours()
  am = if h < 12 then 'AM' else 'PM'
  h = if h == 0 then 12 else if h > 12 then h - 12 else h
  mi = (if d.getMinutes() < 10 then "0" else "") + d.getMinutes()
  "#{h}:#{mi} #{am}<br>#{d.getDate()} #{mo} #{d.getFullYear()}"

getItem = wiki.getItem = (element) ->
  $(element).dataDash()[0]

wiki.getDataNodes = (vis) ->
  if vis
    idx = $('.item').index(vis)
    who = $(".item:lt(#{idx})").filter('.chart,.data,.calculator').toArray().reverse()
    $(who)
  else
    who = $('.chart,.data,.calculator').toArray().reverse()
    $(who)

wiki.getData = (vis) ->
  if vis
    idx = $('.item').index(vis)
    who = $(".item:lt(#{idx})").filter('.chart,.data,.calculator').last()
    if who then who.dataDash('data')[0] else {}
  else
    who = $('.chart,.data,.calculator').last()
    if who then who.dataDash('data')[0] else {}


# The main page building function, called in the context of the page div to be
# built.
# RENDERING for a page when found or retrieved


refresh = wiki.refresh = ->
  pageElement = $(this)

  slug = pageElement.dataDash('slug')[0]
  site = pageElement.dataDash('site')[0]

  pageElement.find(".add-factory").live "click", (evt) ->
    evt.preventDefault()
    item =
      type: "factory"
      id: randomBytes(8)
    itemElement = $("<div />", class: "item factory").dataDash(item)
    itemElement.data 'pageElement', pageElement
    pageElement.find(".story").append(itemElement)
    doPlugin itemElement, item
    beforeElement = itemElement.prev('.item')
    before = getItem(beforeElement)
    putAction pageElement, {item: item, id: item.id, type: "add", after: before?.id}

  initDragging = ->
    storyElement = pageElement.find('.story')
    storyElement.sortable
      update: (evt, ui) ->
        itemElement = ui.item
        item = getItem(itemElement)
        thisPageElement = $(this).parents('.page:first')
        sourcePageElement = itemElement.data('pageElement')
        destinationPageElement = itemElement.parents('.page:first')
        journalElement = thisPageElement.find('.journal')
        equals = (a, b) -> a and b and a.get(0) == b.get(0)

        moveWithinPage = not sourcePageElement or equals(sourcePageElement, destinationPageElement)
        moveFromPage = not moveWithinPage and equals(thisPageElement, sourcePageElement)
        moveToPage = not moveWithinPage and equals(thisPageElement, destinationPageElement)

        action = if moveWithinPage
          order = $(this).find('.item').dataDash('id')
          {type: 'move', order: order}
        else if moveFromPage
          {type: 'remove'}
        else if moveToPage
          itemElement.data 'pageElement', thisPageElement
          beforeElement = itemElement.prev('.item')
          before = getItem(beforeElement)
          {type: 'add', item: item, after: before?.id}

        action.id = item.id
        putAction pageElement, action

      connectWith: '.page .story'

  buildPage = (data) ->
    empty =
      title: 'empty'
      synopsys: 'empty'
      story: []
      journal: []

    page = $.extend(empty, data)
    {title} = data
    $(pageElement).dataDash({title})

    context = ['origin']
    addContext = (string) ->
      if string?
        context = _.without context, string
        context.push string
    addContext action.site for action in page.journal
    addContext site
    wiki.log 'build', slug, 'context', context.join ' => '
    wiki.resolutionContext = context

    if site?
      $(pageElement)
        .append "<h1><a href=\"//#{site}\"><img src = \"/remote/#{site}/favicon.png\" height = \"32px\"></a> #{page.title}</h1>"
    else
      $(pageElement)
        .append(
          $("<h1 />").append(
            $("<a />").attr('href', '/').append(
              $("<img>")
                .error((e) ->
                  getPlugin('favicon', (plugin) ->
                    plugin.create()))
                .attr('class', 'favicon')
                .attr('src', '/favicon.png')
                .attr('height', '32px')
            ), " #{page.title}"))

    [storyElement, journalElement, footerElement] = ['story', 'journal', 'footer'].map (className) ->
      $("<div />").addClass(className).appendTo(pageElement)

    $.each page.story, (i, item) ->
      div = $("<div />").addClass("item").addClass(item.type).dataDash(item)
      storyElement.append div
      doPlugin div, item

    $.each page.journal, (i, action) ->
      addToJournal journalElement, action

    footerElement
      .append('<a id="license" href="http://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a> . ')
      .append("<a class=\"show-page-source\" href=\"/#{slug}.json?random=#{randomBytes(4)}\" title=\"source\">JSON</a> . ")
      .append("<a href=\"#\" class=\"add-factory\" title=\"add paragraph\">[+]</a>")

    wiki.setUrl()

  fetch = (slug, callback, localContext) ->
    wiki.fetchContext = ['origin'] unless wiki.fetchContext.length > 0
    localContext ?= (i for own i in wiki.fetchContext)
    site = localContext.shift()
    resource = if site=='origin'
      site = null
      slug
    else
      "remote/#{site}/#{slug}"
    wiki.log 'fetch', resource
    $.ajax
      type: 'GET'
      dataType: 'json'
      url: "/#{resource}.json?random=#{randomBytes(4)}"
      success: (page) ->
        wiki.log 'fetch success', page, site || 'origin'
        $(pageElement).dataDash({site})
        callback(page)
      error: (xhr, type, msg) ->
        if localContext.length > 0
          fetch(slug, callback, localContext)
        else
          site = null
          callback(null)

  create = (slug, callback) ->
    title = $("""a[href="/#{slug}.html"]""").html()
    title or= slug
    page = {title}
    putAction $(pageElement), {type: 'create', id: randomBytes(8), item: page}
    callback page

  if $(pageElement).dataDash('server-generated')[0] == 'true'
    initDragging()
    pageElement.find('.item').each (i, each) ->
      div = $(each)
      item = getItem(div)
      getPlugin item.type, (plugin) ->
        plugin.bind div, item
  else
    if wiki.useLocalStorage() and json = localStorage[pageElement.dataDash('slug')[0]]
      pageElement.addClass("local")
      buildPage JSON.parse(json)
      initDragging()
    else
      if site?
        $.get "/remote/#{site}/#{slug}.json?random=#{randomBytes(4)}", "", (page) ->
          buildPage page
          initDragging()
      else
        fetch slug, (page) ->
          if page?
            buildPage page
            initDragging()
          else
            create slug, (page) ->
              buildPage page
              initDragging()

# PLUGIN loading
scripts = {}
wiki.getScript = (url, callback = () ->) ->
  if scripts[url]?
    callback()
  else
    $.getScript(url, ->
      scripts[url] = true
      callback()
    )

wiki.dump = ->
  for p in $('.page')
    wiki.log '.page', p
    wiki.log '.item', i, 'data-item', $(i).dataDash() for i in $(p).find('.item')
  null

getPlugin = wiki.getPlugin = (name, callback) ->
  return callback(plugin) if plugin = window.plugins[name]
  wiki.getScript "/plugins/#{name}.js", () ->
    callback(window.plugins[name])

doPlugin = wiki.doPlugin = (div, item) ->
  error = (ex) ->
    errorElement = $("<div />").addClass('error')
    errorElement.text(ex.toString())
    div.append(errorElement)

  try
    div.data 'pageElement', div.parents(".page")
    div.dataDash item
    getPlugin item.type, (plugin) ->
      throw TypeError("Can't find plugin for '#{item.type}'") unless plugin?
      try
        plugin.emit div, item
        plugin.bind div, item
      catch err
        error(err)
  catch err
    error(err)

doInternalLink = wiki.doInternalLink = (name, page) ->
  name = asSlug(name)
  $(page).nextAll().remove() if page?
  createPage(name)
    .appendTo($('.main'))
    .each refresh
  setActive($('.page').last())

# Default PLUGINS for each story item type

window.plugins =
  paragraph:
    emit: (div, item) -> div.append "<p>#{resolveLinks(item.text)}</p>"
    bind: (div, item) ->
      div.dblclick -> textEditor div, item
  image:
    emit: (div, item) ->
      item.text ||= item.caption
      wiki.log 'image', item
      div.append "<img src=\"#{item.url}\"> <p>#{resolveLinks(item.text)}</p>"
    bind: (div, item) ->
      div.dblclick -> textEditor div, item
      div.find('img').dblclick -> wiki.dialog item.text, this
  chart:
    emit: (div, item) ->
      chartElement = $('<p />').addClass('readout').appendTo(div).text(item.data.last().last())
      captionElement = $('<p />').html(resolveLinks(item.caption)).appendTo(div)
    bind: (div, item) ->
      div.find('p:first').mousemove (e) ->
        [time, sample] = item.data[Math.floor(item.data.length * e.offsetX / e.target.offsetWidth)]
        $(e.target).text sample.toFixed(1)
        $(e.target).siblings("p").last().html formatTime(time)
      .dblclick ->
        wiki.dialog "JSON for #{item.caption}", $('<pre/>').text(JSON.stringify(item.data, null, 2))
  changes:
    emit: (div, item) ->
      div.append ul = $('<ul />').append if localStorage.length then $('<input type="button" value="discard all" />').css('margin-top','10px') else $('<p>empty</p>')
      for i in [0...localStorage.length]
        key = localStorage.key(i)
        a = $('<a class="internal" href="#" />').append(key).dataDash('pageName', key)
        ul.prepend($('<li />').append(a))
    bind: (div, item) ->
      div.find('input').click ->
        localStorage.clear()
        div.find('li').remove()
  stats:
    emit: (div, item) ->
    bind: (div, item) ->
      row = (key, value) ->
        objs = -> (obj for obj of value['on']).join(' ')
        "<tr><td>#{key}<td>#{value['get']}<td>#{value['set']}<td>#{value['remove']}<td>#{objs()}"
      table = ->
        stats = wiki.dataDash.stats()
        "<table>#{(row key, stats[key] for key of stats).join("\n")}</table>"
      div.append($('<input type="button" value="update" /><p />').css('margin-top', '10px'))
      report = div.find 'p'
      report.html table
      div.find('input').click -> report.html table

