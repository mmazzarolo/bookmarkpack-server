var User = require('../models/User');

/**
 * GET /api/me
 */
exports.getMe = function(req, res, next) {
  User.findById(req.me, function(err, user) {
    if (err) return next(err);
    res.send(user);
  });
};

/**
 * PATCH /api/me
 */
exports.patchMe = function(req, res, next) {
  req.assert('email', 'Incorrect email').optional().isEmail();
  req.assert('username', 'Reserved username.').optional().isNotReserved();
  req.assert('username', 'Only letters and number allowed for username.').optional().isClean();

  var errors = req.validationErrors();
  if (errors) return res.status(422).send({ message: 'Validation error.', errors: errors });

  User.findById(req.me, function(err, user) {
    if (!user) return res.status(400).send({ message: 'User not found' });

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
 * DELETE /api/me
 */
exports.deleteMe = function(req, res, next) {
  req.assert('confirm', 'Passwords must match.').optional().equals(req.body.password);

  var errors = req.validationErrors();
  if (errors) return res.send(errors);

  User.findOne({ email: req.body.email }, '+password', function(err, user) {
    if (err) return next(err);
    if (!user) return res.status(401).send({ message: 'Wrong email and/or password' });
    user.comparePassword(req.body.password, function(err, isMatch) {
      if (!isMatch) return res.status(401).send({ message: 'Wrong email and/or password' });
      User.remove({ _id: user.id }, function(err) {
        if (err) return next(err);
        res.status(200).end();
      });
    });
  });
};
