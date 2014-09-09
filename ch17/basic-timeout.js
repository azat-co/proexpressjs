var domain = require('domain');
var d = domain.create();
d.on('error', function(e) {
   console.log('Custom Error: ' + e);
});
d.run(function() {
  setTimeout(function () {
    throw new Error('Failed!');
  }, Math.round(Math.random()*100));
});

