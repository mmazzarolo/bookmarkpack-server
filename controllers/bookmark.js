var _ = require('lodash');
var S = require('string');
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

// Extracting the title from the page
function extractTitle(url, done) {
  request(url, function (err, response, body) {
    if (!body) {
      done(null, 'Invalid address');
      return;
    }
    var re = new RegExp('<title>(.*?)</title>', 'i');
    var match = body.match(re);
    var title = '';
    if (match) title = match[1];
    done(err, title);
  });
};

// Extracting the favicon from the url
function extractFavicon(url, done) {
  var faviconUrl =  unescape('http://www.google.com/s2/favicons?domain=' + url);
  request({ uri: faviconUrl, encoding: 'binary' }, function (err, response, body) {
    var favicon = undefined;
    if (!err && response.statusCode == 200) {
      var type = response.headers['content-type'];
      var prefix = 'data:' + type + ';base64,';
      var image = new Buffer(body.toString(), 'binary').toString("base64")
      favicon = prefix + image;
    }
    done(err, favicon);
  });
};

/**
 * POST :username/bookmarks
 * New bookmark.
 *
 * req.body (must be an array of bookmarks)
 */
exports.postBookmarks = function(req, res, next) {

  var resBookmarks = [];

  async.each(req.body, function(bookmark, complete) {

    async.parallel({
      title: function(done) {
        extractTitle(bookmark.url, done);
      },
      favicon: function(done) {
        extractFavicon(bookmark.url, done)
      }
    },
    function(err, results) {
      if (err) return next(err);
      var name = (S(bookmark.name).isEmpty()) ? results.title : bookmark.name;
      var newBookmark = new Bookmark({
        url: bookmark.url,
        name: name,
        title: results.title,
        favicon: results.favicon,
        hidden: false
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
        res.status(200).send({ bookmarks: resBookmarks }).end();
      });
    });
  });
};

/**
 * PATCH :username/bookmarks/:bookmark
 * Edit a bookmark.
 *
 * req.body (must be a bookmark)
 */
exports.patchBookmark = function(req, res, next) {
  async.parallel({
    title: function(done) {
      if (req.body.url) {
        extractTitle(req.body.url, done);
      } else {
        done(null, undefined);
      }
    },
    favicon: function(done) {
      if (req.body.url) {
        extractFavicon(req.body.url, done)
      } else {
        done(null, undefined);
      }
    }
  },
  function(err, results) {
    if (err) return next(err);
    User.findById(req.user.id, function(err, user) {
      if (err) return next(err);
      var bookmark = user.bookmarks.id(req.bookmark._id);
      bookmark.name = req.body.name || bookmark.name;
      bookmark.url = req.body.url || bookmark.url;
      bookmark.title = results.title || bookmark.title;
      bookmark.favicon = results.favicon || bookmark.favicon;
      user.save(function(err) {
        if (err) return next(err);
        res.status(200).send({ bookmark : bookmark });
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

/**
 * DELETE :username/:bookmark
 * Delete a bookmark.
 */
exports.deleteBookmark = function(req, res, next) {
  User.findById(req.user._id, function(err, user) {
    if (err) return next(err);
    user.bookmarks.id(req.bookmark._id).remove();
    user.save(function(err) {
      if (err) return next(err);
      res.status(200).end();
    });
  });
};
