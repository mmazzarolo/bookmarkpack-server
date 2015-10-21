var mongoose = require('mongoose');

var bookmarkSchema = new mongoose.Schema({
  url: { type: String, required: true },
  name: String,
  title: { type: String, default: '' },
  updated: { type: Date, default: Date.now },
  favicon: String,
  hidden: Boolean
});

module.exports = mongoose.model('Bookmark', bookmarkSchema);
