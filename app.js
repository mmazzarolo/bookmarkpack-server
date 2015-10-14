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
  errorFormatter: function(param, msg, value) {
    var namespace = param.split('.');
    var root = namespace.shift();
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
require('./routes')(app);

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

function mongoValidationHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    var errors = [];
    for (var field in err.errors) {
      var item = {};
      item.param = err.errors[field].path;
      item.value = err.errors[field].value;
      for (i = 0; i < err.errors[field].message.length; i++) {
        item.message = err.errors[field].message[i];
        errors.push(item);
      }
    }
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
