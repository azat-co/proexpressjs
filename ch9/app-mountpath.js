var express= require('express'),
  app = express(),
  post = express(),
  comment = express();

app.use('/post', post);
post.use('/comment', comment);

console.log(app.mountpath); // ''
console.log(post.mountpath); // '/post'
console.log(comment.mountpath); // '/comment'