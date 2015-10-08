var bcrypt = require('bcrypt-nodejs');
var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var Bookmark = require('../models/Bookmark');

var userSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true, lowercase: true },
  username: { type: String, unique: true, sparse: true, index: true, lowercase: true },
  password: { type: String, select: false },

  picture: String,

  facebook: String,
  google: String,

  resetPasswordToken: String,
  resetPasswordExpires: Date,

  bookmarks: [mongoose.model('Bookmark').schema]
});

/**
 * Password hash middleware.
 */
userSchema.pre('save', function(next) {
  var user = this;
  if (!user.isModified('password')) return next();
  bcrypt.genSalt(10, function(err, salt) {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = function(password, done) {
  bcrypt.compare(password, this.password, function(err, isMatch) {
    done(err, isMatch);
  });
};

userSchema.plugin(uniqueValidator, { message: 'The {PATH} "{VALUE}" is already in use.' });

module.exports = mongoose.model('User', userSchema);
