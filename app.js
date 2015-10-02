var _ = require('lodash');
var bodyParser = require('body-parser');
var compress = require('compression');
var cors = require('cors');
var express = require('express');
var expressValidator = require('express-validator');
var logger = require('morgan');
var methodOverride = require('method-override');
var mongoose = require('mongoose');
var path = require('path');

var reserved = require('./config/reserved');
var secrets = require('./config/secrets');

/**
 * Create Express server.
 */
var app = express();

/**
 * Connect to MongoDB.
 */
mongoose.connect(secrets.db);
mongoose.connection.on('error', function() {
  console.error('MongoDB Connection Error. Please make sure that MongoDB is running.');
});

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 3000);
app.use(compress());
app.use(cors({credentials: true}));
app.options('*', cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride());

/**
 * ExpressValidator configuration.
 */
app.use(expressValidator({
  customValidators: {
    isClean: function(value) {
      var pattern = /[^a-zA-Z0-9-]/
      return !pattern.test(value);
    },
    isNotReserved: function(value) {
      return !_.contains(reserved.usernames, value);
    }
  },
  errorFormatter: function(param, msg, value) {
    var namespace = param.split('.')
    var root = namespace.shift()
    var formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      message : msg,
      value : value
    };
  }
}));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

/**
 * Routes configurations.
 */
require('./config/routes')(app);

app.get('*', function(req, res, next) {
  var err = new Error('Not found');
  err.status = 404;
  next(err);
});

/**
 * Error handling.
 */
app.use(mongoValidationHandler);
app.use(errorHandler);

function logErrors(err, req, res, next) {
  console.error(err);
  next(err);
}

function mongoValidationHandler(err, req, res, next) {
  console.error(err);
  if (err.name == 'ValidationError') {
    console.log(err);
    var errors = [];
    for (field in err.errors) {
      item = {}
      item ['param'] = err.errors[field].path;
      item ['message'] = err.errors[field].message;
      item ['value'] = err.errors[field].value;
    }
    errors.push(item);
    return res.status(422).send({message: 'Validation errors.', errors: errors});
  }
  next(err);
}

function errorHandler(err, req, res, next) {
  console.log(err);
  res.status(500).send(err);
}

/**
 * Start Express server.
 */
app.listen(app.get('port'), function() {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});
module.exports = app;
