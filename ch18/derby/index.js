var http = require('http'),
  express = require('express'),
  derby = require('derby'),
  derbyApp = require('./derby-app');

var expressApp = new express(),
  server = http.createServer(expressApp);

var store = derby.createStore({
  listen: server
});

var model = store.createModel();

expressApp.
  use(store.modelMiddleware()).
  use(express.static(__dirname + '/public')).
  use(derbyApp.router()).
  use(expressApp.router);

server.listen(3001, function(){
  model.set('message', 'Hello World!');
  store.afterDb('set','message', function(txn, doc, prevDoc, done){
    console.log(txn)
    done();
  })
});