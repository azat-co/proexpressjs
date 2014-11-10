
var express= require('express'),
  app = express(),
  post = express(),
  comment = express();

app.use('/post', post);
post.use('/comment', comment);

console.log(app.path()); // ''
console.log(post.path()); // '/post'
console.log(comment.path()); // '/post/comment'