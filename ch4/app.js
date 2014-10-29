var express = require('express'),
  path = require('path'),
  fs = require('fs'),
  compression = require('compression'),
  logger = require('morgan'),
  timeout = require('connect-timeout'),
  methodOverride = require('method-override'),
  responseTime = require('response-time'),
  favicon = require('serve-favicon'),
  serveIndex = require('serve-index'),
  vhost = require('vhost'),
  busboy = require('connect-busboy'),
  errorhandler = require('errorhandler');

var app = express();

app.set('view cache', true);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('port', process.env.PORT || 3000);
app.use(compression({threshold: 1}));
app.use(logger('combined'));
// app.use(logger(':method :url :status :res[content-length] - :response-time ms'));
app.use(methodOverride('_method'));
app.use(responseTime(4));
app.use(favicon(path.join('public', 'favicon.ico')));

app.use('/shared', serveIndex(
  path.join('public','shared'),
  {'icons': true}
));
app.use(express.static('public'));

app.use('/upload', busboy({immediate: true }));
app.use('/upload', function(request, response) {
  request.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    file.on('data', function(data){
      fs.writeFile('upload' + fieldname + filename, data);
    });
    file.on('end', function(){
      console.log('File ' + filename + ' is ended');
    });

  });
 request.busboy.on('finish', function(){
    console.log('Busboy is finished');
   response.status(201).end();
 })
});

app.get(
  '/slow-request',
  timeout('1s'),
  function(request, response, next) {
    setTimeout(function(){
      if (request.timedout) return false;
      return next();
    }, 999 + Math.round(Math.random()));
  }, function(request, response, next) {
    response.send('ok');
  }
);

app.delete('/purchase-orders', function(request, response){
  console.log('The DELETE route has been triggered');
  response.status(204).end();
});

app.get('/response-time', function(request, response){
  setTimeout(function(){
    response.status(200).end();
  }, 513);
});

app.get('/', function(request, response){
  response.send('Pro Express.js Middleware');
});
app.get('/compression', function(request, response){
  response.render('index');
})
app.use(errorhandler());
var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});
