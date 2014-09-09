var http = require('http'),
  express = require('express'),
  path = require('path'),
  logger = require('morgan'),
  favicon = require('serve-favicon'),
  errorHandler = require('errorhandler');

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(logger('combined'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));

var domain = require('domain');
var defaultHandler = errorHandler();


app.get('/error-domain', function (req, res, next) {
  var d = domain.create();
  d.on('error', function (error) {
    console.error(error.stack);
    d.exit()
    res.status(500).send({'Custom Error': error.message});
  });
  d.run(function () {
    //error prone code goes here
    // throw new Error('Database is down.');
    setTimeout(function () {
      throw new Error('Database is down.');
    }, Math.round(Math.random()*100));
  });
});

app.get('/error-no-domain', function (req, res, next) {
  //error prone code goes here
  // throw new Error('Database is down.');
  setTimeout(function () {
    throw new Error('Database is down.');
  }, Math.round(Math.random()*100));
});

app.use(function (error, req, res, next) {
  console.log(domain)
  if (domain.active) {
    console.info('Caught with domain', domain.active);
    domain.active.emit('error', error);
  } else {
    console.info('No domain');
    defaultHandler(error, req, res, next);
  }
});


var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});
