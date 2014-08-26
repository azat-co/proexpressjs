var express = require('express'),
  path = require('path'),
  logger = require('morgan'),
  favicon = require('serve-favicon'),
  errorhandler = require('errorhandler');

var app = express();
var router = express.Router();

app.set('view engine', 'jade');
app.set('port', process.env.PORT || 3000);
app.use(logger('combined'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static('public'));

var users = {
  'azat': {
    email: 'hi@azat.co',
    website: 'http://azat.co',
    blog: 'http://webapplog.com'
  }
};

var findUserByUsername = function (username, callback) {
  //perform database query that calls callback when it’s done
  // this is our fake database
  if (!users[username])
    return callback(new Error(
      'No user matching '
       + username
      )
    );
  return callback(null, users[username]);
};

app.get('/v1/users/:username', function(request, response, next) {
  var username = request.params.username;
  findUserByUsername(username, function(error, user) {
    if (error) return next(error);
    return response.render('user', user);
  });
});

app.get('/v1/admin/:username', function(request, response, next) {
  var username = request.params.username;
  findUserByUsername(username, function(error, user) {
    if (error) return next(error);
    return response.render('admin', user);
  });
});


var findUserByUsernameMiddleware = function(request, response, next){
  if (request.params.username) {
    console.log(
      'Username param was is detected: ',
      request.params.username
    );
    findUserByUsername(
      request.params.username,
      function(error, user){
        if (error) return next(error);
        request.user = user;
        return next();
      }
    );
  } else {
    return next();
  }
}
app.get('/v2/users/:username',
  findUserByUsernameMiddleware,
  function(request, response, next){
  return response.render('user', request.user);
});
app.get('/v2/admin/:username',
  findUserByUsernameMiddleware,
  function(request, response, next){
  return response.render('admin', request.user);
});




app.param('v3Username', function(request, response, next, username){
  console.log(
    'Username param was is detected: ',
    username
  )
  findUserByUsername(
    username,
    function(error, user){
      if (error) return next(error);
      request.user = user;
      return next();
    }
  );
});

app.get('/v3/users/:v3Username',
  function(request, response, next){
    return response.render('user', request.user);
  }
);
app.get('/v3/admin/:v3Username',
  function(request, response, next){
    return response.render('admin', request.user);
  }
);

router.param('username', function(request, response, next, username){
  console.log(
    'Username param was is detected: ',
    username
  )
  findUserByUsername(
    username,
    function(error, user){
      if (error) return next(error);
      request.user = user;
      return next();
    }
  );
})
router.get('/users/:username',
  function(request, response, next){
    return response.render('user', request.user);
  }
);
router.get('/admin/:username',
  function(request, response, next){
    return response.render('admin', request.user);
  }
);
app.use('/v4', router);

app.use(errorhandler());
var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});
