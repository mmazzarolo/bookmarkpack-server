var User = require('../models/User');

/**
 * GET /account
 */
exports.getAccount = function(req, res, next) {
  User.findById(req.me, function(err, user) {
    if (err) return next(err);
    res.send(user);
  });
};

/**
 * PATCH /account
 *
 * req.body.username
 */
exports.patchAccount = function(req, res, next) {
  User.findById(req.me, function(err, user) {
    if (!user) return res.status(400).send({ message: 'User not found.' });
    if (!user.verified) return res.status(403).send({ message: 'You must verify your account first.' });

    user.email = req.body.email || user.email;
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
 * req.body.password
 */
exports.deleteAccount = function(req, res, next) {
  User.findById(req.me, function(err, user) {
    if (!user) return res.status(400).send({ message: 'User not found.' });
    if (!user.verified) return res.status(403).send({ message: 'You must verify your account first.' });
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
 * req.body.oldPassword
 * req.body.newPassword
 */
exports.postPassword = function(req, res, next) {
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
 * req.body.email
 * req.body.password
 */
exports.postEmail = function(req, res, next) {
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
