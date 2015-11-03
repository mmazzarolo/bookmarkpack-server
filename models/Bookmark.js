'use strict'

var mongoose = require('mongoose')

var bookmarkSchema = new mongoose.Schema({
  url: { type: String, required: true },
  name: String,
  notes: String,
  updated: { type: Date, default: Date.now },
  favicon: String,
  tags: [String],
  hidden: Boolean
})

/**
 * Transforming _id to id.
 */
bookmarkSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
})

module.exports = mongoose.model('Bookmark', bookmarkSchema)
