'use strict'

var _ = require('lodash')
var async = require('async')
var jsonValidator = require('is-my-json-valid')
var validator = require('validator');

var reserved = require('../config/reserved')

/**
 * Custom validators
 */
validator.extend('isClean', function (str) {
  var pattern = /[^a-zA-Z0-9-]/
  return !pattern.test(str)
});

validator.extend('notReserved', function (str) {
  return !_.contains(reserved.usernames, value)
});

/**
 * Bookmarks JSON validation.
 */
exports.validateBookmarksJson = function(req, res, next) {
  console.log('-> validateBookmarksJson')

  var schema = {
    required: true,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id : { type: 'integer' },
        url: { type: 'string' },
        name: { type: 'string' },
        notes: { type: 'string' },
        favicon: { type: 'string', media: { type: 'image/png', binaryEncoding: 'base64' } },
        tags: { type: 'array', items: { type: 'string' }, uniqueItems: true },
        hidden: { type: 'boolean' }
      }
    }
  }

  var validate = jsonValidator(schema, { verbose: true, greedy: true })

  if (validate(req.body)) {
    next()
  } else {
    var errors = formatJsonError(validate.errors)
    return res.status(422).send({ message: 'Validation error.', errors: errors }).end()
  }
}

function formatJsonError(jsonErrors) {
  var errors = []
  for (var i = 0; i < jsonErrors.length; i++) {
    var err = jsonErrors[i]
    var param = err.field.match(/([^.]*$)/)[1]
    var index = err.field.match(/\.(.*)\./)[1]
    var message = err.message
    if (err.message == 'is required')
      message = 'The ' + param + ' field is required.'
    else if (err.message == 'is the wrong type')
      message = 'The ' + param + ' field has the wrong type.'
    else if (err.message == 'is the wrong type')
      message = 'The ' + param + ' field has the wrong type.'
    errors.push({
      param: param,
      message: message,
      value: err.value,
      index: index
    })
  }
  return errors
}

exports.postMyBookmarks = function(req, res, next) {
  console.log('-> validatePostBookmarks')

  var errors = []

  async.forEachOf(req.body, function (bookmark, index, callback) {
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
    callback()
  }, function (err) {
    console.log(errors)
    if (errors.length > 0)
      return res.status(422).send({ message: 'Validation error.', errors: errors })
    next()
  })
}

exports.deleteMyBookmarks = function(req, res, next) {
  console.log('-> validateDeleteBookmarks')

  var errors = []

  async.forEachOf(req.body, function (bookmark, index, callback) {
    if (!validator.isMongoId(bookmark.id)) {
      errors.push({
        param: 'id',
        value: bookmark.id,
        message : 'Invalid bookmark ID.',
        index: index
      })
    }
    callback()
  }, function (err) {
    console.log(errors)
    if (errors.length > 0)
      return res.status(422).send({ message: 'Validation error.', errors: errors })
    next()
  })
}
