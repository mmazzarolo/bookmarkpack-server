'use strict';

var _ = require('lodash');
var bcrypt = require('bcrypt-nodejs');
var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var validate = require('mongoose-validator-all');

var reserved = require('../config/reserved');
var Bookmark = require('../models/Bookmark');

/**
 * Fields validation.
 */
var validators = {
  username: validate.multiValidate([
    {
      validator: 'isLength',
      arguments: [4, 20],
      passIfEmpty: true,
      message: 'Username should be between {ARGS[0]} and {ARGS[1]} characters.'
    }, {
      validator: 'isAlphanumeric',
      passIfEmpty: true,
      message: 'Username should contain alpha-numeric characters only.'
    }, {
      validator: function (val) {
        return !_.contains(reserved.usernames, val);
      },
      passIfEmpty: true,
      message: 'Username not available.'
    }
  ]),
  email: validate.multiValidate([
    {
      validator: 'isEmail',
      passIfEmpty: true,
      message: 'Invalid email adress.'
    }
  ]),
  password: validate.multiValidate([
    {
      validator: 'isLength',
      arguments: [4, 20],
      message: 'Password should be have at least {ARGS[0]} characters.'
    }
  ])
};

/**
 * Schema definition.
 */
var userSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true, lowercase: true, validate: validators.email },
  username: { type: String, unique: true, sparse: true, index: true, lowercase: true, validate: validators.username },
  password: { type: String, select: false, validate: validators.password },

  picture: String,

  facebook: String,
  google: String,

  verified: { type: Boolean, default: false },
  verificationToken: String,

  resetPasswordToken: String,
  resetPasswordExpires: Date,

  bookmarks: { type: [mongoose.model('Bookmark').schema], select: true }
});

/**
 * Password hash middleware.
 */
userSchema.pre('save', function(next) {
  var user = this;
  if (!user.password) return next();
  if (!user.isModified('password')) return next();
  console.log('pre');
  console.log(user.password);
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
