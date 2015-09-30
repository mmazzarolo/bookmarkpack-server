var bodyParser = require('body-parser');
var cors = require('cors');
var express = require('express');
var expressValidator = require('express-validator');
var logger = require('morgan');
var methodOverride = require('method-override');
var mongoose = require('mongoose');
var path = require('path');

/**
 * API keys and Passport configuration.
 */
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
app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(expressValidator());
app.use(function(req, res, next) {
  res.locals.user = req.user || false;
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

require('./config/routes')(app);

app.get('*', function(req, res, next) {
  var err = new Error('Not');
  err.status = 404;
  next(err);
});

/**
 * Error handling.
 */
app.use(methodOverride());
app.use(mongoValidationHandler);
app.use(errorHandler);

function logErrors(err, req, res, next) {
  console.error(err.stack);
  next(err);
}

function mongoValidationHandler(err, req, res, next) {
  if (err.name == 'ValidationError') {
  var errors = [];
    for (field in err.errors) {
      item = {}
      item ['param'] = err.errors[field].path;
      item ['msg'] = err.errors[field].message;
      item ['value'] = err.errors[field].value;
    }
    errors.push(item);
    return res.status(500).send(errors);
  }
  next(err);
}

function errorHandler(err, req, res, next) {
  res.status(500).send('error', { error: err });
}

/**
 * Start Express server.
 */
app.listen(app.get('port'), function() {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});
module.exports = app;
