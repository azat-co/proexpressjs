var express= require('express'),
  app = express(),
  post = express(),
  comment = express();

post.on('mount', function(parent){
  console.log(parent.mountpath); // '/'
})
comment.on('mount', function(parent){
  console.log(parent.mountpath); // '/post'
})

app.use('/post', post);
post.use('/comment', comment);

