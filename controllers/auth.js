var jwt = require('jwt-simple');
var moment = require('moment');

var secrets = require('../config/secrets');
var User = require('../models/User');

/**
 * JSON web token creation.
 */
function createJWT(user) {
  var payload = {
    sub: user._id,
    iat: moment().unix(),
    exp: moment().add(14, 'days').unix()
  };
  return jwt.encode(payload, secrets.tokenSecret);
}

/**
 * POST /auth/login
 */
exports.postLogin = function(req, res, next) {
  User.findOne({ email: req.body.email }, '+password', function(err, user) {
    if (err) return next(err);
    if (!user) return res.status(401).send({ msg: 'Wrong email and/or password' });
    user.comparePassword(req.body.password, function(err, isMatch) {
      if (err) return next(err);
      if (!isMatch) return res.status(401).send({ msg: 'Wrong email and/or password' });
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
  req.assert('confirm', 'Passwords must match.').equals(req.body.password);

  var errors = req.validationErrors();
  if (errors) return res.send(errors);

  User.findOne({ email: req.body.email }, function(err, existingUser) {
    if (err) return next(err);
    if (existingUser) {
      return res.status(409).send({ msg: 'Email is already taken' });
    }
    var user = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password
    });
    user.save(function(err) {
      if (err) return next(err);
      res.send({ token: createJWT(user) });
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
    client_secret: secrets.google.clientSecret,
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
        return res.status(500).send({msg: profile.error.message});
      }
      // Step 3a. Link user accounts.
      if (req.headers.authorization) {
        User.findOne({ google: profile.sub }, function(err, existingUser) {
          if (err) return next(err);
          if (existingUser) {
            return res.status(409).send({ msg: 'There is already a Google account that belongs to you' });
          }
          var token = req.headers.authorization.split(' ')[1];
          var payload = jwt.decode(token, secrets.tokenSecret);
          User.findById(payload.sub, function(err, user) {
            if (err) return next(err);
            if (!user) {
              return res.status(400).send({ msg: 'User not found' });
            }
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
          if (err) return next(err);
          if (existingUser) {
            return res.send({ token: createJWT(existingUser) });
          }
          var user = new User();
          user.google = profile.sub;
          user.picture = profile.picture.replace('sz=50', 'sz=200');
          user.save(function(err) {
            if (err) return next(err);
            var token = createJWT(user);
            res.send({ token: token });
          });
        });
      }
    });
  });
};

/**
 * POST /auth/facebook
 */
exports.postFacebook = function(req, res) {
  var accessTokenUrl = 'https://graph.facebook.com/v2.3/oauth/access_token';
  var graphApiUrl = 'https://graph.facebook.com/v2.3/me';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: secrets.facebook.clientSecret,
    redirect_uri: req.body.redirectUri
  };

  // Step 1. Exchange authorization code for access token.
  request.get({ url: accessTokenUrl, qs: params, json: true }, function(err, response, accessToken) {
    if (response.statusCode !== 200) {
      return res.status(500).send({ msg: accessToken.error.message });
    }

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: graphApiUrl, qs: accessToken, json: true }, function(err, response, profile) {
      if (response.statusCode !== 200) {
        return res.status(500).send({ msg: profile.error.message });
      }
      if (req.headers.authorization) {
        User.findOne({ facebook: profile.id }, function(err, existingUser) {
          if (err) return next(err);
          if (existingUser) {
            return res.status(409).send({ msg: 'There is already a Facebook account that belongs to you' });
          }
          var token = req.headers.authorization.split(' ')[1];
          var payload = jwt.decode(token, secrets.tokenSecret);
          User.findById(payload.sub, function(err, user) {
            if (err) return next(err);
            if (!user) {
              return res.status(400).send({ msg: 'User not found' });
            }
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
          if (err) return next(err);
          if (existingUser) {
            var token = createJWT(existingUser);
            return res.send({ token: token });
          }
          var user = new User();
          user.facebook = profile.id;
          user.picture = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
          user.save(function() {
            if (err) return next(err);
            var token = createJWT(user);
            res.send({ token: token });
          });
        });
      }
    });
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = function(req, res, next) {
  req.assert('email', 'Please enter a valid email address.').isEmail();

  var errors = req.validationErrors();
  if (errors) return res.send(errors);

  async.waterfall([
    function(done) {
      crypto.randomBytes(16, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);l
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email.toLowerCase() }, function(err, user) {
        if (!user) return res.status(400).send({ msg : 'No account with that email address exists.' });

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: secrets.sendgrid.user,
          pass: secrets.sendgrid.password
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'bookmark@pack.com',
        subject: 'Reset your password on BookmarkPack',
        text: 'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
  });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = function(req, res, next) {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirm', 'Passwords must match.').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) return res.send(errors);

  async.waterfall([
    function(done) {
      User
        .findOne({ resetPasswordToken: req.params.token })
        .where('resetPasswordExpires').gt(Date.now())
        .exec(function(err, user) {
          if (!user) return res.status(400).send({ msg : 'Password reset token is invalid or has expired.' });

          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;

          user.save(function(err) {
            if (err) return next(err);
            req.logIn(user, function(err) {
              done(err, user);
            });
          });
        });
    },
    function(user, done) {
      var transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: secrets.sendgrid.user,
          pass: secrets.sendgrid.password
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'bookmark@pack.com',
        subject: 'Your BookmarkPack password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        done(err);
      });
    }
  ], function(err) {
    if (err) return next(err);
  });
};

/**
 * POST /unlink
 */
exports.postUnlink = function(req, res) {
  var provider = req.body.provider;
  var providers = ['facebook', 'google'];

  if (providers.indexOf(provider)) return res.status(400).send({ message: 'Unknown OAuth Provider' });

  User.findById(req.me, function(err, user) {
    if (err) return next(err);
    if (!user) return res.status(400).send({ msg: 'User Not Found' });
    user[provider] = undefined;
    user.save(function() {
      if (err) return next(err);
      res.status(200).end();
    });
  });
};
