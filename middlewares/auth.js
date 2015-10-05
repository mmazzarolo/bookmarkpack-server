var jwt = require('jwt-simple');
var moment = require('moment');

var secretsConfig = require('../config/secrets');
var User = require('../models/User');

/**
 * Authentication required middleware.
 */
exports.isAuthenticated = function(req, res, next) {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Please make sure your request has an Authorization header' });
  }
  var token = req.headers.authorization.split(' ')[1];

  var payload = null;
  try {
    payload = jwt.decode(token, secretsConfig.tokenSecret);
  } catch (err) {
    return res.status(401).send({ message: err.message });
  }

  if (payload.exp <= moment().unix()) {
    return res.status(401).send({ message: 'Token has expired' });
  }
  req.me = payload.sub;
  next();
}

/**l
 * Authorization required middleware.
 */
exports.isAuthorized = function(req, res, next) {
  if (!req.user._id.equals(req.me)) return res.status(203).send({ message: 'Not authorized' });
  next();
};
