var debug = require('debug')('test user')

module.exports = User;

function User() {
  debug('constructed a user: %j', this);
}

User.sharedCtor = function(id, callback) {
  var user = new User();
  user.username = 'joe';
  callback(null, user);
}
User.sharedCtor.shared = true;
User.sharedCtor.accepts = {arg: 'id', type: 'string'};
User.sharedCtor.http = [
  {path: '/:id', verb: 'get'},
  {path: '/', verb: 'get'}
];

var login = User.login = function(credentials, callback) {
  debug('login with credentials: %j', credentials);
  setTimeout(function() {
    if(!credentials.password) {
      return callback(new Error('password required'));
    }
    callback(null, {userId: 123});
  }, 0);
}
login.shared = true;
login.accepts = {arg: 'credentials', type: 'object'};
login.returns = {arg: 'session', type: 'object'};

var hasUsername = User.prototype.hasUsername = function(username, callback) {
  callback(null, username === this.username);
}

hasUsername.shared = true;
hasUsername.accepts = {arg: 'username', type: 'string'};
hasUsername.returns = {arg: 'hasUsername', type: 'boolean'};
