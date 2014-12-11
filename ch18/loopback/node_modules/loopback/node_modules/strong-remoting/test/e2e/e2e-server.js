// this server should be started before running tests in the e2e directory
var path = require('path');
var FIXTURES = path.join(__dirname, 'fixtures');
var remotes = require(path.join(FIXTURES, 'remotes'));

require('http')
  .createServer(remotes.handler('rest'))
  .listen(3000, function() {
    console.log('e2e server listening...');
  });
