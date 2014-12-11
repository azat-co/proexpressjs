var racer = require('racer');
var BCSocket = require('browserchannel/dist/bcsocket-uncompressed').BCSocket;

var CLIENT_OPTIONS = {{clientOptions}};

racer.Model.prototype._createSocket = function() {
  var base = CLIENT_OPTIONS.base || '/channel';
  return new BCSocket(base, CLIENT_OPTIONS);
};
