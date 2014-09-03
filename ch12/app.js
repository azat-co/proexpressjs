var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);

app.use(cookieParser());
app.use(session({
  resave: true,
  saveUninitialized: true,
  store: new RedisStore({
    host: 'localhost',
    port: 6379
  }),
  secret: '0FFD9D8D-78F1-4A30-9A4E-0940ADE81645',
  cookie: { path: '/', maxAge: 3600000 }
}));

app.get('/', function(request, response){
  console.log('Session ID: ', request.sessionID)
  if (request.session.counter) {
    request.session.counter=request.session.counter +1;
  } else {
    request.session.counter = 1;
  }
  response.send('Counter: ' + request.session.counter)
});

app.listen(3000);