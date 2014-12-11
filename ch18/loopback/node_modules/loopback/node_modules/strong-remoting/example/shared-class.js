var express = require('express');

// define a vanilla JavaScript class
function Dog(name) {
  this.name = name;
}

// add a shared constructor
Dog.sharedCtor = function (name, fn) {
  fn(null, new Dog(name));
}

// define the args for the shared constructor
Dog.sharedCtor.accepts = {arg: 'name', type: 'string', http: {source: 'path'}};

// change the default routing
Dog.sharedCtor.http = {path: '/:name'};

// define a regular instance method
Dog.prototype.speak = function (fn) {
  fn(null, 'roof! my name is ' + this.name);
}

// mark it as shared
Dog.prototype.speak.returns = {arg: 'result', type: 'string', root: true};
Dog.prototype.speak.shared = true;

// create a set of shared classes
var remotes = require('../').create();

// expose the Dog class
remotes.exports.dog = Dog;

var app = express();
app.use(remotes.handler('rest'));

app.listen(3000);
  
/*

Test the above with curl or a rest client:
  
  $ node shared-class.js
  $ curl http://localhost:3000/dog/fido/speak 
  roof! my name is fido

*/
