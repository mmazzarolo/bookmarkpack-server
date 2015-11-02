'use strict'
var jsonValidator = require('is-my-json-valid')

var User = require('../models/User')
var secretsConfig = require('../config/secrets')
var reserved = require('../config/reserved')

function formatJsonError(jsonErrors) {
  console.log('-> formatJsonError')

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

/**
 *
 */
exports.validatePostBookmarks = function(req, res, next) {
  console.log('-> validatePostBookmarks')

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

  // if (req.body)

  //   var customErrMsgs = {
  //   'required': function(field) {
  //     return "The " + field + " field is required";
  //   },
  //   'type': function(field, type) {
  //     return "The " + field + " field has the wrong type (" + type + ")";
  //   },
  //   'format': function(field, format) {
  //     return "The " + field + " field needs to be a valid " + format;
  //   }
  // };
  // var validate = validator(bookmarksSchema, {
  //   verbose: true,
  //   greedy: true
  // })

  if (validate(req.body)) {
    next()
  } else {
    var errors = formatJsonError(validate.errors)
    return res.status(422).send({ message: 'Validation error.', errors: errors }).end()
  }
}
