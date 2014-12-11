var loopback = require('loopback');
var app = loopback();
var explorer = require('../');
var port = 3000;

var User = loopback.Model.extend('user', {
  username: 'string',
  email: 'string',
  sensitiveInternalProperty: 'string',
}, {hidden: ['sensitiveInternalProperty']});

User.attachTo(loopback.memory());
app.model(User);

var apiPath = '/api';
app.use('/explorer', explorer(app, {basePath: apiPath}));
app.use(apiPath, loopback.rest());
console.log('Explorer mounted at localhost:' + port + '/explorer');

app.listen(port);
