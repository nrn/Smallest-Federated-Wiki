# MAIN callback that jQuery calls when the dom is ready.
wiki = window.wiki
{locsInDom, pagesInDom, urlPages, urlLocs, createPage} = wiki

$ ->
  # VARIABLES used throughout
  dataDash = wiki.dataDash = DataDash({stats: true})
  refresh = wiki.refresh
  wiki.resolutionContext = []
  wiki.fetchContext = []
  LEFTARROW = 37
  RIGHTARROW = 39

  #prepare a Dialog to popup
  window.dialog = $('<div></div>')
	  .html('This dialog will show every time!')
	  .dialog { autoOpen: false, title: 'Basic Dialog', height: 600, width: 800 }
  wiki.dialog = (title, html) ->
    window.dialog.html html
    window.dialog.dialog "option", "title", resolveLinks(title)
    window.dialog.dialog 'open'

  # FUNCTIONS and HANDLERS to manage location bar and back button, history

  setUrl = wiki.setUrl = ->
    if history and history.pushState
      locs = locsInDom()
      pages = pagesInDom()
      url = ("/#{locs?[idx] or 'view'}/#{page}" for page, idx in pages when page).join('')
      if url and url isnt $(location).attr('pathname')
        wiki.log 'set state', locs, pages
        history.pushState(null, null, url)

  setActive = (el) ->
    el = $(el)
    wiki.log 'set active', el
    $(".active").removeClass("active")
    scrollTo el.addClass("active")

  showState = (e) ->
    # show and refresh correct pages
    wiki.log('popstate', e)
    oldPages = pagesInDom()
    newPages = urlPages()
    oldLocs = locsInDom()
    newLocs = urlLocs()

    return if (!location.pathname or location.pathname is '/')

    wiki.log 'showState', oldPages, newPages, oldLocs, newLocs

    previous = $('.page').eq(0)
    for name, idx in newPages
      unless name is oldPages[idx]
        old = $('.page').eq(idx)
        old.remove() if old
        createPage(name, newLocs[idx]).insertAfter(previous).each refresh
      previous = $('.page').eq(idx)

    previous.nextAll().remove()

    setActive($('.page').last())

  # NAVIGATION Code
  # Find which element is scrollable, body or html
  scrollContainer = undefined
  findScrollContainer = ->
    scrolled = $("body, html").filter -> $(this).scrollLeft() > 0
    if scrolled.length > 0
      scrolled
    else
      $("body, html").scrollLeft(4).filter(-> $(this).scrollLeft() > 0).scrollTop(0)

  scrollTo = (el) ->
    scrollContainer ?= findScrollContainer()
    bodyWidth = $("body").width()
    minX = scrollContainer.scrollLeft()
    maxX = minX + bodyWidth
    wiki.log 'scrollTo', el, el.position()
    target = el.position().left
    width = el.outerWidth(true)
    contentWidth = $(".page").outerWidth(true) * $(".page").size()

    if target < minX
      scrollContainer.animate scrollLeft: target
    else if target + width > maxX
      scrollContainer.animate scrollLeft: target - (bodyWidth - width)
    else if maxX > $(".pages").outerWidth()
      scrollContainer.animate scrollLeft: Math.min(target, contentWidth - bodyWidth)

  $(document).keydown (event) ->
    direction = switch event.which
      when LEFTARROW then -1
      when RIGHTARROW then +1
    if direction && not (event.target.tagName is "TEXTAREA")
      pages = $('.page')
      newIndex = pages.index($('.active')) + direction
      if 0 <= newIndex < pages.length
        setActive(pages[newIndex])


  # HANDLERS for jQuery events

  $(window).on 'popstate', showState

  $(document)
    .ajaxError (event, request, settings) ->
      wiki.log 'ajax error', event, request, settings
      msg = "<li class='error'>Error on #{settings.url}: #{request.responseText}</li>"
      $('.main').prepend msg unless request.status == 404

  $('.main')
    .delegate '.show-page-source', 'click', (e) ->
      e.preventDefault()
      pageElement = $(this).parent().parent()
      json = pageToJson(pageElement)
      wiki.dialog "JSON for #{json.title}",  $('<pre/>').text(JSON.stringify(json, null, 2))

    .delegate '.page', 'click', (e) ->
      setActive this unless $(e.target).is("a")

    .delegate '.internal', 'click', (e) ->
      e.preventDefault()
      name = $(e.target).dataDash('pageName')[0]
      wiki.fetchContext = $(e.target).attr('title').split(' => ')
      wiki.log 'click', name, 'context', wiki.fetchContext
      $(e.target).parents('.page').nextAll().remove() unless e.shiftKey
      createPage(name).appendTo('.main').each refresh
      setActive(this)
      # FIXME: can open page multiple times with shift key

    .delegate '.action', 'hover', ->
      id = JSON.stringify($(this).dataDash('id')[0])
      $("[data-id=\"#{id}\"].item").toggleClass('target')

    .delegate '.action.fork, .remote', 'click', (e) ->
      e.preventDefault()
      name = $(e.target).dataDash('slug')[0]
      wiki.log 'click', name, 'site', $(e.target).dataDash('site')[0]
      $(e.target).parents('.page').nextAll().remove() unless e.shiftKey
      createPage(name)
        .dataDash('site',$(e.target).dataDash('site')[0])
        .appendTo($('.main'))
        .each refresh
      setActive(this)

  # Authentication handling
  $(".provider input").click ->
    $("footer input:first").val $(this).dataDash('provider')[0]
    $("footer form").submit()

  useLocalStorage = wiki.useLocalStorage = ->
    $(".login").length > 0

  wiki.setUrl()

  firstUrlPages = urlPages()
  firstUrlLocs = urlLocs()
  wiki.log 'amost createPage', firstUrlPages, firstUrlLocs, pagesInDom()
  for urlPage, idx in firstUrlPages when urlPage not in pagesInDom()
    wiki.log 'createPage', urlPage, idx
    createPage(urlPage, firstUrlLocs[idx]).appendTo('.main') if urlPage

  $('.page').each refresh
  setActive($('.page').last())
