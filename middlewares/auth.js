var jwt = require('jwt-simple');
var moment = require('moment');

var User = require('../models/User');
var secretsConfig = require('../config/secrets');

/**
 * Authentication required middleware.
 */
exports.isAuthenticated = function(req, res, next) {
  console.log('-> isAuthenticated');

  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Please make sure your request has an Authorization header.' });
  }
  var token = req.headers.authorization.split(' ')[1];

  var payload = null;
  try {
    payload = jwt.decode(token, secretsConfig.tokenSecret);
  } catch (err) {
    return res.status(401).send({ message: err.message });
  }

  if (payload.exp <= moment().unix()) {
    return res.status(401).send({ message: 'Token has expired, please login again.' });
  }
  req.me = payload.sub;
  next();
};

/**
 * Get authenticated user middleware.
 */
exports.getAuthenticatedUser = function(req, res, next) {
  console.log('-> getAuthenticatedUser');

  User.findById(req.me, function(err, user) {
    if (err) return next(err);
    if (!user) return res.status(404).send({ message: 'Unknown user.' });
    req.user = user;
    next();
  });
};

/**
 * Authorization required middleware.
 */
exports.isAuthorized = function(req, res, next) {
  console.log('-> isAuthorized');

  if (!req.user._id.equals(req.me)) return res.status(203).send({ message: 'Not authorized.' });
  next();
};
