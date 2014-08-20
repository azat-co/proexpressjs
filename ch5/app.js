var express = require('express'),
  path = require('path'),
  logger = require('morgan'),
  favicon = require('serve-favicon'),
  errorhandler = require('errorhandler'),
  jade = require('jade'),
  consolidate = require('consolidate');

var app = express();

// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');
// app.set('view engine', 'html');
app.engine('html', jade.__express);
app.engine('template', jade.__express);
app.engine('swig', consolidate.swig);

app.set('port', process.env.PORT || 3000);
app.use(logger('combined'));
app.use(favicon(path.join('public', 'favicon.ico')));
app.use(express.static('public'));

app.get('/', function(request, response){
  response.render('index.html');
});

app.get('/template', function(request, response){
  response.render('index.template');
});

app.get('/swig', function(request, response){
  response.render('index.swig');
})

app.use(errorhandler());
var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});
