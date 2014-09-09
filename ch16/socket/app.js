var http = require('http'),
  express = require('express'),
  path = require('path'),
  logger = require('morgan'),
  favicon = require('serve-favicon'),
  errorhandler = require('errorhandler'),
  bodyParser = require('body-parser');

var app = express();

app.set('view engine', 'jade');
app.set('port', process.env.PORT || 3000);
app.use(logger('combined'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static('public'));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function(request, response){
  response.render('index');
});

app.use(errorhandler());

var server = http.createServer(app);
var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {
  socket.on('messageChange', function (data) {
    console.log(data);
    socket.emit('receive', data.message.split('').reverse().join('') );
  });
});


server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
