'use strict'

var jsonValidator = require('is-my-json-valid')

/**
 * Format input bookmark in an array of bookmarks and checks their JSON validity.
 */
 exports.formatBookmarks = function(req, res, next) {
  console.log('-> formatMiddleware.formatBookmarks')

  if (req.body.constructor === Array) {
    req.isReqArray = true
  } else {
    req.isReqArray = false
    var bookmarks = []
    bookmarks[0] = req.body
    req.body = bookmarks
  }

  var schema = {
    required: true,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id : { type: 'string' },
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
    return res.status(422).send({ message: 'Validation error.', errors: errors })
  }
}

function formatJsonError(jsonErrors) {
  console.log(jsonErrors)
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
    errors.push({
      param: param,
      message: message,
      value: err.value,
      index: index
    })
  }
  return errors
}
