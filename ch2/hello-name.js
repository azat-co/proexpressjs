var express = require('express');
var port = 3000;
var app = express();

app.get('/name/:user_name', function(request,response) {
  response.status(200);
  response.set('Content-Type', 'text/html');
  response.end('<html><body>' +
    '<h1>Hello ' + request.params.user_name + '</h1>' +
    '</body></html>'
  );
});

app.get('*', function(request, response){
  response.end('Hello World');
});

app.listen(port, function(){
  console.log('The server is running, ' +
    ' please open your browser at http://localhost:%s',
     port);
});
