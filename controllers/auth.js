'use strict';

var _ = require('lodash');
var async = require('async');
var crypto = require('crypto');
var jwt = require('jwt-simple');
var moment = require('moment');
var request = require('request');

var User = require('../models/User');

var secretsConfig = require('../config/secrets');
var mailConfig = require('../config/mail');


var sendgrid  = require('sendgrid')(secretsConfig.sendgridApiKey);

/**
 * JSON web token creation.
 */
function createJWT(user) {
  var payload = {
    sub: user._id,
    iat: moment().unix(),
    exp: moment().add(14, 'days').unix()
  };
  return jwt.encode(payload, secretsConfig.tokenSecret);
}

/**
 * POST /auth/login
 *
 * User login.
 *
 * @param {string} body.email - User's email.
 * @param {string} body.password - User's password.
 * @return {token} - JWT token.
 */
exports.postLogin = function(req, res, next) {
  console.log('-> postLogin');
  console.log('req.body.email: ' + req.body.email);
  console.log('req.body.password: ' + req.body.password);

  req.assert('email', 'Email is required.').notEmpty();
  req.assert('password', 'Password is required.').notEmpty();
  var errors = req.validationErrors();
  if (errors) return res.status(422).send({ message: 'Validation error.', errors: errors }).end();

  User.findOne({ email: req.body.email }, '+password', function(err, user) {
    if (err) return next(err);
    if (!user) return res.status(401).send({ message: 'Wrong email and/or password.' });
    user.comparePassword(req.body.password, function(err, isMatch) {
      if (!isMatch) return res.status(401).send({ message: 'Wrong email and/or password.' });
      res.send({ token: createJWT(user) });
    });
  });
};

/**
 * POST /auth/signup
 *
 * User local signup.
 *
 * @param {string} body.email - User's email.
 * @param {string} body.password - User's password.
 * @param {string} body.username - User's username (optional).
 * @return {token} - JWT token.
 */
exports.postSignup = function(req, res, next) {
  console.log('-> postSignup');

  req.assert('email', 'Invalid email address.').isEmail();
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('username', 'Reserved username.').optional().notReserved();
  req.assert('username', 'Only letters and number allowed for username.').optional().isClean();
  var errors = req.validationErrors();
  if (errors) return res.status(422).send({ message: 'Validation error.', errors: errors }).end();

  User.findOne({ email: req.body.email }, function(err, existingUser) {
    if (err) return next(err);
    if (existingUser) return res.status(409).send({ message: 'Email already in use.' });
    var user = new User({
      email: req.body.email,
      password: req.body.password,
      username: req.body.username
    });
    user.save(function(err) {
      if (err) return next(err);
      res.send({ token: createJWT(user) });
      next();
    });
  });
};

/**
 * POST /auth/google
 *
 * Google login/signup.
 *
 * @param {string} body.code - The login code from Google.
 * @param {string} body.clientId - The clientId of the application.
 * @param {string} body.redirectUri - The redirect URL of the caller.
 * @return {token} - JWT token.
 */
exports.postGoogle = function(req, res, next) {
  console.log('-> postGoogle');

  var accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
  var peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: secretsConfig.googleSecret,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post(accessTokenUrl, { json: true, form: params }, function(err, response, token) {
    var accessToken = token.access_token;
    var headers = { Authorization: 'Bearer ' + accessToken };

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: peopleApiUrl, headers: headers, json: true }, function(err, response, profile) {
      if (profile.error) {
        return res.status(500).send({ message: profile.error.message });
      }
      // Step 3a. Link user accounts.
      if (req.headers.authorization) {
        User.findOne({ google: profile.sub }, function(err, existingUser) {
          // if (err) return next(err);
          if (existingUser) return res.status(409).send({ message: 'There is already a Google account that belongs to you.' });
          var token = req.headers.authorization.split(' ')[1];
          var payload = jwt.decode(token, secretsConfig.tokenSecret);
          User.findById(payload.sub, function(err, user) {
            // if (err) return next(err);
            if (!user) return res.status(400).send({ message: 'User not found.' });
            if (!user.verified) return res.status(403).send({ message: 'You must verify your account first.' });
            user.google = profile.sub;
            user.picture = user.picture || profile.picture.replace('sz=50', 'sz=200');
            user.save(function() {
              if (err) return next(err);
              var token = createJWT(user);
              res.send({ token: token });
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        User.findOne({ google: profile.sub }, function(err, existingUser) {
          if (existingUser) {
            return res.send({ token: createJWT(existingUser) });
          }
          User.findOne({ email: profile.email }, function(err, existingEmailUser) {
            if (existingEmailUser) {
              return res.status(409).send({ message: 'Email already in use.' });
            } else {
              var user = new User();
              user.google = profile.sub;
              user.picture = profile.picture.replace('sz=50', 'sz=200');
              user.email = profile.email;
              user.verified = true;
              user.save(function(err) {
                if (err) return next(err);
                var token = createJWT(user);
                res.send({ token: token });
              });
            }
          });
        });
      }
    });
  });
};

/**
 * POST /auth/facebook
 *
 * Google login/signup.
 *
 * @param {string} body.code - The login code from Facebook.
 * @param {string} body.clientId - The clientId of the application.
 * @param {string} body.redirectUri - The redirect URL of the caller.
 * @return {token} - JWT token.
 */
exports.postFacebook = function(req, res, next) {
  console.log('-> postFacebook');

  var accessTokenUrl = 'https://graph.facebook.com/v2.3/oauth/access_token';
  var graphApiUrl = 'https://graph.facebook.com/v2.3/me' + '?fields=email,name,id';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: secretsConfig.facebookSecret,
    redirect_uri: req.body.redirectUri
  };

  // Step 1. Exchange authorization code for access token.
  request.get({ url: accessTokenUrl, qs: params, json: true }, function(err, response, accessToken) {
    if (response.statusCode !== 200) {
      return res.status(500).send({ message: accessToken.error.message });
    }

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: graphApiUrl, qs: accessToken, json: true }, function(err, response, profile) {
      if (response.statusCode !== 200) {
        return res.status(500).send({ message: profile.error.message });
      }
      // Step 3. Check if the user is logged in or
      if (req.headers.authorization) {
        User.findOne({ facebook: profile.id }, function(err, existingUser) {
          if (err) return next(err);
          if (existingUser) return res.status(409).send({ message: 'There is already a Facebook account that belongs to you.' });
          var token = req.headers.authorization.split(' ')[1];
          var payload = jwt.decode(token, secretsConfig.tokenSecret);
          User.findById(payload.sub, function(err, user) {
            if (err) return next(err);
            if (!user) return res.status(400).send({ message: 'User not found.' });
            if (!user.verified) return res.status(403).send({ message: 'You must verify your account first.' });
            user.facebook = profile.id;
            user.picture = user.picture || 'https://graph.facebook.com/v2.3/' + profile.id + '/picture?type=large';
            user.save(function() {
              if (err) return next(err);
              var token = createJWT(user);
              res.send({ token: token });
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        User.findOne({ facebook: profile.id }, function(err, existingUser) {
          if (existingUser) {
            var token = createJWT(existingUser);
            return res.send({ token: token });
          }
          User.findOne({ email: profile.email }, function(err, existingEmailUser) {
            if (existingEmailUser) {
              return res.status(409).send({ message: 'Email already in use.' });
            } else {
              var user = new User();
              user.facebook = profile.id;
              user.picture = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
              user.email = profile.email;
              user.verified = true;
              user.save(function() {
                if (err) return next(err);
                var token = createJWT(user);
                res.send({ token: token });
              });
            }
          });
        });
      }
    });
  });
};

/**
 * POST auth/reset
 *
 * Create a random token, then the send user an email with a reset link.
 *
 * @param {string} body.email - User's email.
 */
exports.postReset = function(req, res, next) {
  console.log('-> postReset');

  req.assert('email', 'Email address is required.').notEmpty();
  req.assert('email', 'Invalid email address.').isEmail();
  var errors = req.validationErrors();
  if (errors) return res.status(422).send({ message: 'Validation error.', errors: errors }).end();

  async.waterfall([
    // Create a crypted token
    function(done) {
      crypto.randomBytes(16, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    // Search an User with the parameter email
    function(token, done) {
      User
        .findOne({ email: req.body.email.toLowerCase() })
        .select('+resetPasswordToken +resetPasswordExpires')
        .exec(function(err, user) {
          if (!user) return res.status(400).send({ message : 'No account with that email address exists.' });
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
          user.save(function(err) {
            if (err) return next(err);
            done(err, token, user);
          });
      });
    },
    // Send the email
    function(token, user, done) {
      var email = mailConfig.resetMail(user.email, token);
      sendgrid.send(email, function(err, json) {
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.status(200).end();
  });
};

 /**
 * POST auth/reset/:token
 *
 * Process the reset password request.
 *
 * @param {string} body.password - User's new password.
 */
exports.postResetConfirm = function(req, res, next) {
  console.log('-> postResetConfirm');

  req.assert('password', 'Password is required.').notEmpty();
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  var errors = req.validationErrors();
  if (errors) return res.status(422).send({ message: 'Validation error.', errors: errors }).end();

  async.waterfall([
    // Search the token user
    function(done) {
      User
        .findOne({ resetPasswordToken: req.params.token })
        .where('resetPasswordExpires').gt(Date.now())
        .select('+resetPasswordToken +resetPasswordExpires')
        .exec(function(err, user) {
          if (!user) return res.status(400).send({ message : 'Password reset token is invalid or has expired.' });
          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;
          user.save(function(err) {
            if (err) return next(err);
            done(err, user);
          });
      });
    },
    // Send the email
    function(user, done) {
      var email = mailConfig.resetConfirmMail(user.email);
      sendgrid.send(email, function(err, json) {
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.status(200).end();
  });
};

 /**
 * POST auth/verify
 *
 * Create a random token, then the send user an email with a verification link.
 *
 * @param {string} body.email - User's email.
 */
exports.postVerify = function(req, res, next) {
  console.log('-> postVerify');

  req.assert('email', 'Email address is required.').notEmpty();
  req.assert('email', 'Invalid email address.').isEmail();
  var errors = req.validationErrors();
  if (errors) return res.status(422).send({ message: 'Validation error.', errors: errors }).end();

  async.waterfall([
    // Create a crypted token
    function(done) {
      crypto.randomBytes(16, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    // Search an User with the parameter email
    function(token, done) {
      User
        .findOne({ email: req.body.email.toLowerCase() })
        .select('+verificationToken')
        .exec(function(err, user) {
          if (!user) return res.status(400).send({ message : 'No account with that email address exists.' });
          if (user.verified) return res.status(401).send({ message : 'Account already verified.' });
          user.verificationToken = token;
          user.save(function(err) {
            if (err) return next(err);
            done(err, token, user);
          });
      });
    },
    // Send the email
    function(token, user, done) {
      var email = mailConfig.verifyMail(user.email, token);
      sendgrid.send(email, function(err, json) {
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.status(200).end();
  });
};

 /**
 * POST auth/verify/:token
 *
 * Process the verification request.
 */
exports.postVerifyConfirm = function(req, res, next) {
  console.log('-> postVerifyConfirm');

  User
    .findOne({ verificationToken: req.params.token })
    .where({ 'verified' : false })
    .select('+verificationToken')
    .exec(function(err, user) {
      if (!user) return res.status(400).send({ message : 'User not found.' });
      user.verified = true;
      user.verificationToken = undefined;
      user.save(function(err) {
        if (err) return next(err);
        res.status(200).end();
      });
  });
};

/**
 * POST /unlink
 *
 * Unlink the user account from facebook or google.
 *
 * @param {string} body.provider - The provider to unlink (can be 'facebook' or 'google').
 */
exports.postUnlink = function(req, res, next) {
  console.log('-> postUnlink');

  var provider = req.body.provider;
  var providers = ['facebook', 'google'];

  if (!_.contains(providers, provider)) return res.status(400).send({ message: 'Unknown OAuth Provider.' });

  User.findById(req.me, function(err, user) {
    if (!user) return res.status(400).send({ message: 'User not found.' });
    user[provider] = undefined;
    user.save(function() {
      if (err) return next(err);
      res.status(200).end();
    });
  });
};
