var express = require('express'),
  path = require('path'),
  logger = require('morgan'),
  favicon = require('serve-favicon'),
  errorhandler = require('errorhandler'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  session = require('express-session');

var csrf = require('csurf'),
  helmet = require('helmet'),
  validator = require('express-validator');

var app = express();

app.set('view engine', 'jade');
app.set('port', process.env.PORT || 3000);
app.use(logger('combined'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static('public'));
app.use(cookieParser('FE28D342-4040-4D0E-B080-B85E85DAF7FD'));
app.use(session({
  secret: 'BD564488-5105-4202-8927-5A5C9AE9154E',
  resave: true,
  saveUninitialized: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(validator());

app.use(csrf());
app.use(function (request, response, next) {
  response.locals.csrftoken = request.csrfToken();
  next();
});

app.use(helmet());

app.get('/', function(request, response){
  response.render('index');
});

app.post('/login-custom', function(request, response){
  var errors = [];
  var emailRegExp = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!request.body.password) errors.push({msg: 'Password is required'});
  if (!request.body.email || !emailRegExp.test(request.body.email) ) errors.push({msg: 'A valid email is required'});
  if (errors)
    response.render('index', {errors: errors});
  else
    response.render('login', {email: request.email});
});


app.post('/login', function(request, response){
  request.assert('password', 'Password is required').notEmpty();
  request.assert('email', 'A valid email is required').notEmpty().isEmail();
  var errors = request.validationErrors();
  if (errors)
    response.render('index', {errors: errors});
  else
    response.render('login', {email: request.email});
});

app.use(errorhandler());

var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});
