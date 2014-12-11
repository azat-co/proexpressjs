var RemoteObjects = require('../../../');
var remotes = module.exports = RemoteObjects.create();

remotes.exports.User = require('./user');
