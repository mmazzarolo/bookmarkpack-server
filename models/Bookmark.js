'use strict';

var mongoose = require('mongoose');

var bookmarkSchema = new mongoose.Schema({
  url: { type: String, required: true },
  name: String,
  updated: { type: Date, default: Date.now },
  favicon: String,
  tags: [String],
  hidden: Boolean
});

module.exports = mongoose.model('Bookmark', bookmarkSchema);
