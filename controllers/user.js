var User = require('../models/User');

/**
 * app.param {username}
 */
exports.user = function(req, res, next, username) {
  console.log('Requested username: ' + username);
  User.findOne({ username: username }, function(err, user) {
    if (err) return next(err);
    if (!user) return res.status(404).send({ message: 'Unknown user.' });
    req.user = user;
    next();
  });
};

/**
 * GET /:username
 * User profile page.
 */
exports.getUser = function(req, res) {
  res.status(200).send({ user: req.user });
};
