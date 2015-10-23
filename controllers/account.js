'use strict';

var User = require('../models/User');

/**
 * GET /account
 */
exports.getAccount = function(req, res, next) {
  console.log('-> getAccount');

  User.findById(req.me, function(err, user) {
    if (err) return next(err);
    res.send(user);
  });
};

/**
 * PATCH /account
 *
 * Change one or more user setting.
 *
 * @param {string} body.username - New username (optional).
 * @param {string} body.picture - New user picture url (optional).
 */
exports.patchAccount = function(req, res, next) {
  console.log('-> patchAccount');

  User.findById(req.me, function(err, user) {
    if (!user) return res.status(400).send({ message: 'User not found.' });
    if (!user.verified) return res.status(403).send({ message: 'You must verify your account first.' });

    user.username = req.body.username || user.username;
    user.picture = req.body.picture || user.picture;

    user.save(function(err) {
      if (err) return next(err);
      res.status(200).end();
    });
  });
};

/**
 * DELETE /account
 *
 * Delete user account.
 *
 * @param {string} body.password - Current password.
 */
exports.deleteAccount = function(req, res, next) {
  console.log('-> deleteAccount');

  User.findById(req.me, '+password', function(err, user) {
    if (!user) return res.status(400).send({ message: 'User not found.' });
    user.comparePassword(req.body.password, function(err, isMatch) {
      if (!isMatch) return res.status(401).send({ message: 'Wrong email and/or password.' });
      User.remove({ _id: user.id }, function(err) {
        if (err) return next(err);
        res.status(200).end();
      });
    });
  });
};

/**
 * POST /account/password
 *
 * Change user password.
 *
 * @param {string} body.oldPassword - Current password.
 * @param {string} body.newPassword - New password.
 */
exports.postPassword = function(req, res, next) {
  console.log('-> postPassword');

  User.findById(req.me, '+password', function(err, user) {
    if (!user) return res.status(400).send({ message: 'User not found.' });
    if (!user.verified) return res.status(403).send({ message: 'You must verify your account first.' });
    user.comparePassword(req.body.oldPassword, function(err, isMatch) {
      if (!isMatch) return res.status(401).send({ message: 'Wrong password.' });
      user.password = req.body.newPassword;
      user.save(function(err) {
        if (err) return next(err);
        res.status(200).end();
      });
    });
  });
};

/**
 * POST /account/email
 *
 * Change user password.
 *
 * @param {string} body.email - New user email (optional).
 * @param {string} body.password - Current password.
 */
exports.postEmail = function(req, res, next) {
  console.log('-> postEmail');

  User.findById(req.me, '+password', function(err, user) {
    if (!user) return res.status(400).send({ message: 'User not found.' });
    if (!user.verified) return res.status(403).send({ message: 'You must verify your account first.' });
    user.comparePassword(req.body.password, function(err, isMatch) {
      if (!isMatch) return res.status(401).send({ message: 'Wrong password.' });
      user.email = req.body.email;
      user.save(function(err) {
        if (err) return next(err);
        res.status(200).end();
      });
    });
  });
};
