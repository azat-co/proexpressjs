var express = require('express');
var https = require('https');
var http = require('http');
var app = express();
var fs = require('fs');

ops = {
    key: fs.readFileSync('host.key'),
    cert: fs.readFileSync('server.crt')
    // ,
    // passphrase: 'your_secret_passpahrase'
};

app.get('/', function(request, response){
  response.send('ok');
})
http.createServer(app).listen(80);
https.createServer(ops, app).listen(443);
