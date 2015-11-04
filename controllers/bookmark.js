'use strict'

var _ = require('lodash')
var async = require('async')
var Busboy = require('busboy')
var cheerio = require('cheerio')
var request = require('request')
var validator = require('validator')

var User = require('../models/User')
var Bookmark = require('../models/Bookmark')

/**
 * GET user/bookmarks
 *
 * Get the bookmarks of the current user.
 *
 * @return {[bookmark]} body - An array with the bookmarks of the current user.
 */
 exports.getMyBookmarks = function(req, res, next) {
  console.log('-> getMyBookmarks')

  User.findById(req.me, '+bookmarks', function(err, user) {
    if (err) return next(err)
    if (!user) return res.status(404).send({ message: 'Unknown user.' })
    res.status(200).send(user.bookmarks)
  })
}

/**
 * POST user/bookmarks
 *
 * Add new bookmarks to the current user.
 *
 * @param {bookmark}/{[bookmark]} body - A single bookmark or an array of bookmarks.
 * @param {bookmark}/{[bookmark]} - The single updated bookmark or the array of updated bookmarks.
 */
 exports.addBookmarks = function(req, res, next) {
  console.log('-> bookmarkController.addBookmarks')

  var extractTitle = (_.indexOf(req.query.extract, 'title') != -1)
  var extractFavicon = (_.indexOf(req.query.extract, 'favicon') != -1)

  var resBookmarks = []
  var validationErrors = []

  User.findById(req.me, '+bookmarks', function(err, user) {
    if (err) return next(err)
    async.forEachOf(req.body, function(bookmark, index, complete) {

      validationErrors = validationErrors.concat(addBookmarksErrors(bookmark, index))
      if (validationErrors.length > 0) return complete()

      extractFromUrl(bookmark.url, extractTitle, extractFavicon, function(err, results) {
        if (err) return next(err)
        var newBookmark = new Bookmark({
          url: bookmark.url,
          name: bookmark.name || results.title,
          favicon: bookmark.favicon || results.favicon
        })
        user.bookmarks.push(newBookmark)
        resBookmarks.push(newBookmark)
        complete()
      })

    }, function(err) {
      if (err) return next(err)
      if (validationErrors.length > 0)
        return res.status(422).send({ message: 'Validation error.', errors: validationErrors })
      user.save(function(err) {
        if (err) return next(err)
        if (req.isReqArray) {
          return res.status(200).send(resBookmarks)
        } else {
          return res.status(200).send(resBookmarks[0])
        }
      })
    })
  })
}

function addBookmarksErrors(bookmark, index) {
  var errors = []
  if (!validator.isURL(bookmark.url)) {
    errors.push({
      param: 'url',
      value: bookmark.url,
      message : 'Invalid URL.',
      index: index
    })
  }
  if (typeof bookmark.name !== 'undefined' && !validator.isLength(bookmark.name, 0, 240)) {
    errors.push({
      param: 'name',
      value: bookmark.name,
      message : 'Name must have less than 240 characters.',
      index: index
    })
  }
  if (typeof bookmark.notes !== 'undefined' && !validator.isLength(bookmark.notes, 0, 820)) {
    errors.push({
      param: 'notes',
      value: bookmark.notes,
      message : 'Notes must have less than 840 characters.',
      index: index
    })
  }
  return errors
}

/**
 * PATCH user/bookmarks/
 *
 * Updates some bookmark info.
 *
 * @param {bookmark/[bookmark]} body - The properties of the bookmarks that must be updated.
 *                                     Every submitted bookmark must have at least the id.
 * @return {bookmark} - The updated bookmark.
 */
 exports.editBookmarks = function(req, res, next) {
  console.log('-> bookmarkController.editBookmarks')

  var extractTitle = (_.indexOf(req.query.extract, 'title') != -1)
  var extractFavicon = (_.indexOf(req.query.extract, 'favicon') != -1)

  var resBookmarks = []
  var validationErrors = []

  User.findById(req.me, '+bookmarks', function(err, user) {
    if (err) return next(err)
    async.forEachOf(req.body, function(bookmark, index, complete) {

      validationErrors = validationErrors.concat(editBookmarksErrors(bookmark, index))
      if (validationErrors.length > 0) return complete()

      extractFromUrl(bookmark.url, extractTitle, extractFavicon, function(err, results) {
        if (err) return next(err)
        bookmark.name = results.title || bookmark.name
        bookmark.favicon = results.favicon || bookmark.favicon

        var oldBookmark = user.bookmarks.id(bookmark.id)
        if (!oldBookmark)
          return res.status(404).send({ message: 'Bookmark not found.', id: bookmark.id })

        oldBookmark.url = bookmark.url
        oldBookmark.name = bookmark.name
        oldBookmark.notes = bookmark.notes
        oldBookmark.favicon = bookmark.favicon
        oldBookmark.tags = bookmark.tags
        oldBookmark.hidden = bookmark.hidden
        resBookmarks.push(bookmark)

        complete()
      })

    }, function(err) {
      if (err) return next(err)
      if (validationErrors.length > 0)
        return res.status(422).send({ message: 'Validation error.', errors: validationErrors })
      user.save(function(err) {
        if (err) return next(err)
        if (req.isReqArray) {
          return res.status(200).send(resBookmarks)
        } else {
          return res.status(200).send(resBookmarks[0])
        }
      })
    })
  })
}

function editBookmarksErrors(bookmark, index) {
  var errors = []
  if (!validator.isMongoId(bookmark.id)) {
    errors.push({
      param: 'id',
      value: bookmark.id,
      message : 'Invalid bookmark ID.',
      index: index
    })
  }
  if (!validator.isURL(bookmark.url)) {
    errors.push({
      param: 'url',
      value: bookmark.url,
      message : 'Invalid URL.',
      index: index
    })
  }
  if (typeof bookmark.name !== 'undefined' && !validator.isLength(bookmark.name, 0, 240)) {
    errors.push({
      param: 'name',
      value: bookmark.name,
      message : 'Name must have less than 240 characters.',
      index: index
    })
  }
  if (typeof bookmark.notes !== 'undefined' && !validator.isLength(bookmark.notes, 0, 820)) {
    errors.push({
      param: 'notes',
      value: bookmark.notes,
      message : 'Notes must have less than 840 characters.',
      index: index
    })
  }
  return errors
}

/**
 * DELETE user/bookmarks/
 *
 * Delete one or more bookmarks.
 *
 * @param {bookmark/[bookmarks]} body - The id or an array of id of the bookmarks to delete.
 */
 exports.deleteBookmarks = function(req, res, next) {
  console.log('-> bookmarkController.deleteBookmarks')

  var validationErrors = []

  User.findById(req.me, '+bookmarks', function(err, user) {
    if (err) return next(err)

    async.forEachOf(req.body, function(bookmark, index, complete) {

      validationErrors = validationErrors.concat(deleteBookmarksErrors(bookmark, index))
      if (validationErrors.length > 0) return complete()

      var bookmarkToDelete = user.bookmarks.id(bookmark.id)
      if (!bookmarkToDelete)
        return res.status(404).send({ message: 'Bookmark not found.', id: bookmark.id })

      bookmarkToDelete.remove()
      complete()
    }, function(err) {
      if (err) return next(err)
      if (validationErrors.length > 0)
        return res.status(422).send({ message: 'Validation error.', errors: validationErrors })
      user.save(function(err) {
        if (err) return next(err)
        return res.status(200).end()
      })
    })
  })
}

function deleteBookmarksErrors(bookmark, index) {
  var errors = []
  if (!validator.isMongoId(bookmark.id)) {
    errors.push({
      param: 'id',
      value: bookmark.id,
      message : 'Invalid bookmark ID.',
      index: index
    })
  }
  return errors
}

/**
 * POST user/bookmarks/import
 *
 * Adds the exported bookmarks to the current user.
 *
 * @param {file} - Bookmarks exported in HTML format.
 */
 exports.import = function(req, res, next) {
  console.log('-> bookmarkController.import')

  var html = ''
  var busboy = new Busboy({
    headers: req.headers,
    limits: { files: 1, fileSize: 1000000 }
  })
  var newBody = []

  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype)
    if (mimetype != 'text/html') {
      req.unpipe(busboy)
      res.writeHead(400, { 'Connection': 'close', 'Content-Type': 'application/json' })
      res.write(JSON.stringify({ 'message' : 'Wrong input file.' }))
      res.end()
      return
    }
    file.on('data', function(data) {
      console.log('File [' + fieldname + '] got ' + data.length + ' bytes')
      html += data.toString()
    })
    file.on('limit', function() {
      console.log('Limit reached!')
      req.unpipe(busboy)
      res.writeHead(400, { 'Connection': 'close', 'Content-Type': 'application/json' })
      res.write(JSON.stringify({ 'message' : 'The uploaded file is too big for being processed.' }))
      res.end()
      return
    })
    file.on('end', function() {
      var $ = cheerio.load(html)
      $('A').each(function(i, elem) {
        var url = $(this).attr('href')
        var name = $(this).text()
        var favicon = $(this).attr('icon')
        newBody.push({
          'url' : url,
          'name' : name,
          'favicon' : favicon
        })
      })
      console.log('File [' + fieldname + '] Finished')
    })
  })
  busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
    console.log('Field [' + fieldname + ']: value: ' + inspect(val))
  })
  busboy.on('finish', function() {
    console.log('Done parsing form!')
    req.isReqArray = true
    req.body = newBody
    next()
  })
  req.pipe(busboy)
}


/**
 * POST user/bookmarks/github
 *
 * Adds the GitHub starred repositories from the specified username.
 *
 * @param {string} body.username - The GitHub username of the owner of the starred repositories to import.
 */
 exports.github = function(req, res, next) {
  console.log('-> bookmarkController.github')

  var re = new RegExp('^[A-Z0-9_]*$', 'i')
  if (typeof(req.body.username) != 'string' || !re.test(req.body.username))
    return res.status(400).send({ message: 'Invalid username' })

  var newBody = []
  var githubUrl = 'https://api.github.com/users/' + req.body.username + '/starred'

  async.waterfall([
    // Extract GitHub favicon
    function(done) {
      extractFaviconFromUrl('https://github.com', done)
    },
    // API call to GitHub to get the starred repos
    function(favicon, done) {
      var options = {
          url: githubUrl,
          method: 'GET',
          headers: {'user-agent': 'node.js'}
      }
      request(options, function (err, response, body) {
        if (response.statusCode != 200) {
          return res.status(404).send({ message: 'User not found' })
        }
        done(err, favicon, JSON.parse(body))
      })
    },
    // Prepare the bookmarks array
    function(favicon, repos, done) {
      async.each(repos, function(repo, complete) {
        var url = repo.html_url
        var name = repo.name
        newBody.push({
          'url' : url,
          'name' : name,
          'favicon' : favicon
        })
        complete()
      }, function(err) {
        if (err) return next(err)
        return done()
      })
    }
  ], function(err, results) {
    if (err) return next(err)
    req.isReqArray = true
    req.body = newBody
    next()
  })

}

/**
 * Given an URL, extract title and/or favicon from a website.
 *
 * @param {string} url - The URL to process.
 * @param {boolean} extractTitle - Extract the title?
 * @param {boolean} extractFavicon - Extract the favicon?
 * @callback {function} done - Callback.
 */
 function extractFromUrl(url, extractTitle, extractFavicon, done) {

  async.parallel({
    title: function(done) {
      if (extractTitle) {
        extractTitleFromUrl(url, done)
      } else {
        return done(null, undefined)
      }
    },
    favicon: function(done) {
      if (extractFavicon) {
        extractFaviconFromUrl(url, done)
      } else {
        return done(null, undefined)
      }
    }
  },
  function(err, results) {
    done(err, results)
  })
}

// Extracting the title from the page
function extractTitleFromUrl(url, done) {
  var stream = ''
  var re = new RegExp('<title>(.*?)</title>', 'i')
  var title

  request.get({ url: url })
  .on('data', function(data) {
    stream = stream + data
    var match = stream.match(re)
    if (match) {
      title = match[1]
      this.abort()
    }
  })
  .on('end', function(data) {
    return done(null, title)
  })
}

// Extracting the favicon from the url
function extractFaviconFromUrl(url, done) {
  var faviconUrl =  unescape('http://www.google.com/s2/favicons?domain=' + url)
  request({ uri: faviconUrl, encoding: 'binary' }, function (err, response, body) {
    var favicon
    if (!err && response.statusCode == 200) {
      var type = response.headers['content-type']
      var prefix = 'data:' + type + ';base64,'
      var image = new Buffer(body.toString(), 'binary').toString("base64")
      favicon = prefix + image
    }
    done(err, favicon)
  })
}
