'use strict';

var _ = require('lodash');
var async = require('async');
var request = require('request');

var User = require('../models/User');
var Bookmark = require('../models/Bookmark');

/**
 * app.param {bookmark}
 */
exports.bookmark = function(req, res, next, id) {
  console.log('Requested bookmark: ' + id);
  var bookmark = _.find(req.user.bookmarks, function(item){
    return item._id == id;
  });
  if (!bookmark) return res.status(404).end();
  req.bookmark = bookmark;
  next();
};

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
        extractTitleFromUrl(url, done);
      } else {
        return done(null, undefined);
      }
    },
    favicon: function(done) {
      if (extractFavicon) {
        extractFaviconFromUrl(url, done);
      } else {
        return done(null, undefined);
      }
    }
  },
  function(err, results) {
    done(err, results);
  });
}

// Extracting the title from the page
function extractTitleFromUrl(url, done) {
  var stream = '';
  var re = new RegExp('<title>(.*?)</title>', 'i');
  var title;

  request.get({ url: url })
  .on('data', function(data) {
    stream = stream + data;
    var match = stream.match(re);
    if (match) {
      title = match[1];
      this.abort();
    }
  })
  .on('end', function(data) {
    return done(null, title);
  });
}

// Extracting the favicon from the url
function extractFaviconFromUrl(url, done) {
  var faviconUrl =  unescape('http://www.google.com/s2/favicons?domain=' + url);
  request({ uri: faviconUrl, encoding: 'binary' }, function (err, response, body) {
    var favicon;
    if (!err && response.statusCode == 200) {
      var type = response.headers['content-type'];
      var prefix = 'data:' + type + ';base64,';
      var image = new Buffer(body.toString(), 'binary').toString("base64");
      favicon = prefix + image;
    }
    done(err, favicon);
  });
}

/**
 * POST user/bookmarks
 *
 * Add new bookmarks to the current user.
 *
 * @param {bookmark}/{[bookmark]} body - A single bookmark or an array of bookmarks.
 * @param {bookmark}/{[bookmark]} - The single updated bookmark or the array of updated bookmarks.
 */
exports.postMyBookmarks = function(req, res, next) {
  console.log('-> postBookmarks');

  var extractTitle = (_.indexOf(req.query.extract, 'title') != -1);
  var extractFavicon = (_.indexOf(req.query.extract, 'favicon') != -1);

  var reqBookmarks = [];
  var resBookmarks = [];
  var isReqArray = false;

  if (req.body.constructor === Array) isReqArray = true;

  if (isReqArray) {
    reqBookmarks = req.body;
  } else {
    reqBookmarks[0] = req.body;
  }

  async.each(reqBookmarks, function(bookmark, complete) {

    extractFromUrl(bookmark.url, extractTitle, extractFavicon, function(err, results) {
      if (err) return next(err);
      var newBookmark = new Bookmark({
        url: bookmark.url,
        name: bookmark.name || results.title,
        favicon: results.favicon
      });
      resBookmarks.push(newBookmark);
      complete();
    });

  }, function(err) {
    if (err) return next(err);
    User.findById(req.user.id, function(err, user) {
      if (err) return next(err);
      for (var i = 0; i < resBookmarks.length; i++) user.bookmarks.push(resBookmarks[i]);
      user.save(function(err) {
        if (err) return next(err);
        if (isReqArray) {
          res.status(200).send(resBookmarks).end();
        } else {
          res.status(200).send(resBookmarks[0]).end();
        }
      });
    });
  });
};

/**
 * PATCH user/bookmarks/
 *
 * Updates some bookmark info.
 *
 * @param {bookmark/[bookmark]} body - The properties of the bookmarks that must be updated.
 *                                     Every submitted bookmark must have an _id.
 * @return {bookmark} - The updated bookmark.
 */
exports.patchMyBookmark = function(req, res, next) {
  console.log('-> patchBookmark');

  var extractTitle = (_.indexOf(req.query.extract, 'title') != -1);
  var extractFavicon = (_.indexOf(req.query.extract, 'favicon') != -1);

  var reqBookmarks = [];
  var resBookmarks = [];
  var isReqArray = false;

  if (req.body.constructor === Array) isReqArray = true;

  if (isReqArray) {
    reqBookmarks = req.body;
  } else {
    reqBookmarks[0] = req.body;
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    async.each(reqBookmarks, function(reqBookmark, complete) {

      console.log(reqBookmark);
      if (!reqBookmark._id) {
        return res.status(400).send({ message: 'One or more of the submitted bookmarks have no _id' }).end();
      }

      extractFromUrl(reqBookmark.url, extractTitle, extractFavicon, function(err, results) {
        if (err) return next(err);
        var updBookmark = user.bookmarks.id(reqBookmark._id);
        updBookmark.name = reqBookmark.name || results.title || updBookmark.name;
        updBookmark.url = reqBookmark.url || updBookmark.url;
        updBookmark.favicon = results.favicon || updBookmark.favicon;
        updBookmark.tags = reqBookmark.tags || updBookmark.tags;
        resBookmarks.push(updBookmark);
        complete();
      });

    }, function(err) {
      if (err) return next(err);
      user.save(function(err) {
        if (err) return next(err);
        if (isReqArray) {
          res.status(200).send(resBookmarks).end();
        } else {
          res.status(200).send(resBookmarks[0]).end();
        }
      });
    });
  });
};

/**
 * DELETE user/bookmarks/
 *
 * Delete one or more bookmarks.
 *
 * @param {bookmark/[bookmarks]} body - The id or an array of id of the bookmarks to delete.
 */
exports.deleteMyBookmark = function(req, res, next) {
  console.log('-> deleteBookmark');

  var reqBookmarks = [];

  if (req.body.constructor === Array) {
    reqBookmarks = req.body;
  } else {
    reqBookmarks[0] = req.body;
  }

  User.findById(req.user._id, function(err, user) {
    if (err) return next(err);

    async.each(reqBookmarks, function(bookmark, complete) {
      user.bookmarks.id(bookmark._id).remove();
      complete();
    }, function(err) {
      if (err) return next(err);
      user.save(function(err) {
        if (err) return next(err);
        res.status(200).end();
      });
    });
  });
};

/**
 * GET :username/:bookmark
 * Get a bookmark.
 */
exports.getBookmark = function(req, res) {
  res.status(200).send({ bookmark : req.bookmark });
};

