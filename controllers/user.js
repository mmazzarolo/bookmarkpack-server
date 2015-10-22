var User = require('../models/User');

/**
 * app.param {username}
 */
exports.username = function(req, res, next, username) {
  console.log('Requested username: ' + username);
  User.findOne({ username: username }, function(err, user) {
    if (err) return next(err);
    if (!user) return res.status(404).send({ message: 'Unknown user.' });
    req.user = user;
    next();
  });
};

/**
 * GET user
 * Current user profile page.
 */
exports.getMe = function(req, res) {
  return res.status(200).send(req.user);
};

/**
 * GET users/:username
 * User profile page.
 */
exports.getUser = function(req, res) {
  return res.status(200).send(req.user);
};
