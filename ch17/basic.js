var domain = require('domain').create();
domain.on('error', function(error){
  console.log(error);
});
domain.run(function(){
  throw new Error('Failed!');
});

