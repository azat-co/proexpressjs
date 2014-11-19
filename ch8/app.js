var express = require('express');
var fs = require('fs');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');

var largeImagePath = path.join(__dirname, 'files', 'large-image.jpg');

var app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('combined'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser('abc'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

app.get('/render', function(req, res) {
  res.render('render');
});

app.get('/render-title', function(req, res) {
  res.render('index', {title: 'Pro Express.js'});
});

app.get('/locals', function(req, res){
  res.locals = { title: 'Pro Express.js' };
  res.render('index');
});

app.get('/set-html', function(req, res) {
  // Some code
  res.set('Content-Type', 'text/html');
  res.end('<html><body>' +
    '<h1>Express.js Guide</h1>' +
    '</body></html>');
});


app.get('/set-csv', function(req, res) {
  var body = 'title, tags\n' +
    'Practical Node.js, node.js express.js\n' +
    'Rapid Prototyping with JS, backbone.js node.js mongodb\n' +
    'JavaScript: The Good Parts, javascript\n'
  res.set({'Content-Type': 'text/csv',
    'Content-Length': body.length,
    'Set-Cookie': ['type=reader', 'language=javascript']});
  res.end(body);
});

app.get('/status', function(req, res) {
  res.status(200).end();
});


app.get('/send-ok', function(req, res) {
  res.status(200).send({message: 'Data was submitted successfully.'});
});

app.get('/send-err', function(req, res) {
  res.status(500).send({message: 'Oops, the server is down.'});
});

app.get('/send-buf', function(req, res) {
  res.set('Content-Type', 'text/plain');
  res.status(200).send(new Buffer('text data that will be converted into Buffer'));
});


app.get('/json', function(req, res) {
  res.status(200).json([{title: 'Practical Node.js', tags: 'node.js express.js'},
    {title: 'Rapid Prototyping with JS', tags: 'backbone.js node.js mongodb'},
    {title: 'JavaScript: The Good Parts', tags: 'javascript'}
  ]);
});

app.get('/non-stream', function(req, res) {
  var file = fs.readFileSync(largeImagePath);
  res.end(file);
});

app.get('/non-stream2', function(req, res) {
  var file = fs.readFile(largeImagePath, function(error, data){
    res.end(data);
  });
});

app.get('/stream1', function(req, res) {
  var stream = fs.createReadStream(largeImagePath);
  stream.pipe(res);
});


app.get('/stream2', function(req, res) {
  var stream = fs.createReadStream(largeImagePath);
  stream.on('data', function(data) {
    res.write(data);
  });
  stream.on('end', function() {
    res.end();
  });
});


/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// Error handlers

// Development error handler
// Will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// Production error handler
// No stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;

var debug = require('debug')('request');


app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function() {
  debug('Express server listening on port ' + server.address().port);
});
