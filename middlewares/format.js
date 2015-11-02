'use strict'

/**
 * Format input bookmark in an array of bookmarks.
 */
 exports.formatBookmarks = function(req, res, next) {
  console.log('-> formatBookmarks')

  if (req.body.constructor === Array) {
    req.isReqArray = true
  } else {
    req.isReqArray = false
    var bookmarks = []
    bookmarks[0] = req.body
    req.body = bookmarks
  }

  next()
}
