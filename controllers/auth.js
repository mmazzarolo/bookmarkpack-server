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
 */
exports.postLogin = function(req, res, next) {
  User.findOne({ email: req.body.email }, '+password', function(err, user) {
    if (err) return next(err);
    if (!user) return res.status(401).send({ message: 'Wrong email and/or password' });
    user.comparePassword(req.body.password, function(err, isMatch) {
      if (!isMatch) return res.status(401).send({ message: 'Wrong email and/or password' });
      res.send({ token: createJWT(user) });
    });
  });
};

/**
 * POST /auth/signup
 */
exports.postSignup = function(req, res, next) {
  req.assert('email', 'Incorrect email').isEmail();
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('username', 'Reserved username.').isNotReserved();
  req.assert('username', 'Only letters and number allowed for username.').isClean();

  var errors = req.validationErrors();
  if (errors) return res.status(422).send({ message: 'Validation error.', errors: errors });

  User.findOne({ email: req.body.email }, function(err, existingUser) {
    if (err) return next(err);
    if (existingUser) return res.status(409).send({ message: 'Email is already taken' });
    var user = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password
    });
    user.save(function(err) {
      if (err) return next(err);
      res.send({ token: createJWT(user) });
      console.log('eccolo');
      next();
    });
  });
};

/**
 * POST /auth/google
 */
exports.postGoogle = function(req, res, next) {
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
          if (existingUser) return res.status(409).send({ message: 'There is already a Google account that belongs to you' });
          var token = req.headers.authorization.split(' ')[1];
          var payload = jwt.decode(token, secretsConfig.tokenSecret);
          User.findById(payload.sub, function(err, user) {
            // if (err) return next(err);
            if (!user) return res.status(400).send({ message: 'User not found' });
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
 */
exports.postFacebook = function(req, res, next) {
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
      console.log(profile);
      // Step 3. Check if the user is logged in or
      if (req.headers.authorization) {
        User.findOne({ facebook: profile.id }, function(err, existingUser) {
          if (err) return next(err);
          if (existingUser) return res.status(409).send({ message: 'There is already a Facebook account that belongs to you' });
          var token = req.headers.authorization.split(' ')[1];
          var payload = jwt.decode(token, secretsConfig.tokenSecret);
          User.findById(payload.sub, function(err, user) {
            if (err) return next(err);
            if (!user) return res.status(400).send({ message: 'User not found' });
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
 * Create a random token, then the send user an email with a reset link.
 */
exports.postReset = function(req, res, next) {
  req.assert('email', 'Please enter a valid email address.').isEmail();

  var errors = req.validationErrors();
  if (errors) return res.status(422).send({ message: 'Validation error.', errors: errors });

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
      User.findOne({ email: req.body.email.toLowerCase() }, function(err, user) {
        if (!user) return res.status(400).send({ message : 'No account with that email address exists.' });
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        user.save(function(err) {
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
 * Process the reset password request.
 */
exports.postResetConfirm = function(req, res, next) {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);

  var errors = req.validationErrors();
  if (errors) return res.status(422).send({ message: 'Validation error.', errors: errors });

  async.waterfall([
    // Search the token user
    function(done) {
      User
        .findOne({ resetPasswordToken: req.params.token })
        .where('resetPasswordExpires').gt(Date.now())
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
 * Create a random token, then the send user an email with a verification link.
 */
exports.postVerify = function(req, res, next) {
  req.assert('email', 'Please enter a valid email address.').isEmail();

  var errors = req.validationErrors();
  if (errors) return res.status(422).send({ message: 'Validation error.', errors: errors });

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
      User.findOne({ email: req.body.email.toLowerCase() }, function(err, user) {
        if (!user) return res.status(400).send({ message : 'No account with that email address exists.' });
        if (user.verified) return res.status(401).send({ message : 'Account already verified.' });
        user.verificationToken = token;
        user.save(function(err) {
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
    console.log(res.token);
    res.status(200).end();
  });
};

/**
 * POST auth/verify/:token
 * Process the verification request.
 */
exports.postVerifyConfirm = function(req, res, next) {
  console.log(req.params.token);
  User
    .findOne({ verificationToken: req.params.token })
    .where({ 'verified' : false })
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
 */
exports.postUnlink = function(req, res, next) {
  var provider = req.body.provider;
  var providers = ['facebook', 'google'];

  if (!_.contains(providers, provider)) return res.status(400).send({ message: 'Unknown OAuth Provider' });

  User.findById(req.me, function(err, user) {
    if (!user) return res.status(400).send({ message: 'User Not Found' });
    user[provider] = undefined;
    user.save(function() {
      if (err) return next(err);
      res.status(200).end();
    });
  });
};
