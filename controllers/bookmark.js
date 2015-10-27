'use strict';

var _ = require('lodash');
var async = require('async');
var request = require('request');
var Busboy = require('busboy');
var cheerio = require('cheerio');

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
        favicon: bookmark.favicon || results.favicon
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

var Transform = require('stream').Transform;
var parser = new Transform();
parser._transform = function(data, encoding, done) {
  this.push(data);
  done();
};

/**
 * POST user/bookmarks/import
 *
 * Adds the exported bookmarks to the current user.
 *
 * @param {file} - Bookmarks exported in HTML format.
 */
 exports.postImport = function(req, res, next) {
  console.log('-> postImport');

  var html = '';
  var newBody = [];
  var busboy = new Busboy({
    headers: req.headers,
    limits: { files: 1, fileSize: 1024 }
  });

  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
    if (mimetype != 'text/html') {
      req.unpipe(busboy);
      res.writeHead(400, { 'Connection': 'close', 'Content-Type': 'application/json' });
      res.write(JSON.stringify({ 'message' : 'Wrong input file.' }));
      res.end();
      return;
    }
    file.on('data', function(data) {
      console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
      html += data.toString();
    });
    file.on('limit', function() {
      console.log('Limit reached!');
      req.unpipe(busboy);
      res.writeHead(400, { 'Connection': 'close', 'Content-Type': 'application/json' });
      res.write(JSON.stringify({ 'message' : 'The uploaded file is too big for being processed.' }));
      res.end();
      return;
    });
    file.on('end', function() {
      var $ = cheerio.load(html);
      $('A').each(function(i, elem) {
        var url = $(this).attr('href');
        var name = $(this).text();
        var favicon = $(this).attr('icon');
        newBody.push({
          'url' : url,
          'name' : name,
          'favicon' : favicon,
        });
      });

      console.log('File [' + fieldname + '] Finished');
    });
  });
  busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
    console.log('Field [' + fieldname + ']: value: ' + inspect(val));
  });
  busboy.on('finish', function() {
    console.log('Done parsing form!');
    req.body = newBody;
    return next();
    res.status(200).end();
  });
  req.pipe(busboy);
};


/**
 * POST user/bookmarks/github
 *
 * Adds the GitHub starred repositories from the specified username.
 *
 * @param {string} body.username - The GitHub username of the owner of the starred repositories to import.
 */
 exports.postGithub = function(req, res, next) {
  console.log('-> postGithub');

  var re = new RegExp('^[A-Z0-9_]*$', 'i');
  if (typeof(req.body.username) != 'string' || !re.test(req.body.username))
    return res.status(400).send({ message: 'Invalid username' }).end();

  var newBody = [];
  var githubUrl = 'https://api.github.com/users/' + req.body.username + '/starred'

  async.parallel({
    favicon: function(done) {
      extractFaviconFromUrl('https://github.com', done);
    },
    repos: function(done) {
      var options = {
          url: githubUrl,
          method: 'GET',
          headers: {'user-agent': 'node.js'}
      };
      request(options, function (err, response, body) {
        if (response.statusCode != 200) {
          return res.status(404).send({ message: 'User not found' }).end();
        }
        done(err, JSON.parse(body));
      });
    }
  },
  function(err, results) {
    if (err) return next(err);
    async.each(results.repos, function(repo, complete) {
      var url = repo.html_url;
      var name = repo.name;
      var favicon = results.favicon;
      newBody.push({
        'url' : url,
        'name' : name,
        'favicon' : favicon
      });
      complete();
    }, function(err) {
      if (err) return next(err);
      req.body = newBody;
      return next();
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

