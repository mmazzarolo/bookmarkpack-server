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
  console.log('bookmark: ' + id);
  var bookmark = _.find(req.user.bookmarks, function(item){
    return item._id === id;
  });
  if (!bookmark) return res.status(404).end();
  req.bookmark = bookmark;
  next();
};

/**
 * POST :username/add
 * New bookmark.
 */
exports.postAdd = function(req, res, next) {
  req.assert('url', 'Invalid URL.').isURL();

  var errors = req.validationErrors();
  if (errors) return res.send(errors);

  async.waterfall([
    // Extracting the title from the page
    function(done) {
      request(req.body.url, function (err, response, body) {
        var re = new RegExp('<title>(.*?)</title>', 'i');
        var title = body.match(re)[1];
        done(err, title);
      });
    },
    // Adding the new bookmark
    function(title, done) {
      User.findById(req.user.id, function(err, user) {
        if (err) return next(err);
        var name = (S(req.body.name).isEmpty())
          ? title
          : req.body.name;
        var bookmark = new Bookmark({
          url: req.body.url,
          name: name,
          title: title,
          hidden: false
        });
        user.bookmarks.push(bookmark);
        user.save(function(err) {
          if (err) return next(err);
          res.status(200).end();
        });
      });
    }
  ], function(err) {
    if (err) return next(err);
  });
};

/**
 * GET :username/:bookmark
 * Edit bookmark.
 */
exports.getDetail = function(req, res) {
  console.log(req.bookmark);
  res.status(200).send({bookmark : req.bookmark});
};

/**
 * PATCH :username/:bookmark
 * Edit bookmark.
 */
exports.patchBookmark = function(req, res, next) {
  console.log(req.body.name);
  User.findById(req.user._id, function(err, user) {
    if (err) return next(err);
    var bookmark = user.bookmarks.id(req.bookmark._id);
    bookmark.name = req.body.name || bookmark.name;
    user.save(function(err) {
      if (err) return next(err);
      res.status(200).send({bookmark : bookmark});
    });
  });
};

/**
 * DELETE :username/:bookmark
 * Delete bookmark.
 */
exports.delete = function(req, res, next) {
  User.findById(req.user._id, function(err, user) {
    if (err) return next(err);
    user.bookmarks.id(req.bookmark._id).remove();
    user.save(function(err) {
      if (err) return next(err);
      res.status(200).end();
    });
  });
};
