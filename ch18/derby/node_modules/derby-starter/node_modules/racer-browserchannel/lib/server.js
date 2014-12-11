var Duplex = require('stream').Duplex;
var browserChannel = require('browserchannel').server;
var through = require('through');
var path = require('path');

// Pass in pass through stream
module.exports = function(store, serverOptions, clientOptions) {
  if (!clientOptions) clientOptions = {};
  if (clientOptions.reconnect == null) clientOptions.reconnect = true;
  var clientOptionsJson = JSON.stringify(clientOptions);

  // Add the client side script to the Browserify bundle. Set the clientOptions
  // needed to connect to the corresponding server by injecting them into the
  // file during bundling
  store.on('bundle', function(bundle) {
    var browserFilename = path.join(__dirname, 'browser.js');
    bundle.transform(function(filename) {
      if (filename !== browserFilename) return through();
      var file = '';
      return through(
        function write(data) {
          file += data;
        }
      , function end() {
          var rendered = file.replace('{{clientOptions}}', clientOptionsJson);
          this.queue(rendered);
          this.queue(null);
        }
      );
    });
    bundle.add(browserFilename);
  });

  var middleware = browserChannel(serverOptions, function(client, connectRequest) {
    var rejected = false;
    var rejectReason;
    function reject(reason) {
      rejected = true;
      if (reason) rejectReason = reason;
    }
    store.emit('client', client, reject);
    if (rejected) {
      // Tell the client to stop trying to connect
      client.stop(function() {
        client.close(rejectReason);
      });
      return;
    }
    var stream = createBrowserChannelStream(client, store.logger);
    var agent = store.shareClient.listen(stream, connectRequest);
    store.emit('share agent', agent, stream);
  });
  return middleware;
};

/**
 * @param {EventEmitters} client is a browserchannel client session for a given
 * browser window/tab that is has a connection
 * @return {Duplex} stream
 */
function createBrowserChannelStream(client, logger) {
  var stream = new Duplex({objectMode: true});

  stream._write = function _write(chunk, encoding, callback) {
    // Silently drop messages after the session is closed
    if (client.state !== 'closed') {
      client.send(chunk);
      if (logger) {
        logger.write({type: 'S->C', chunk: chunk, client: client});
      }
    }
    callback();
  };
  // Ignore. You can't control the information, man!
  stream._read = function _read() {};

  client.on('message', function onMessage(data) {
    // Ignore Racer channel messages
    if (data && data.racer) return;
    stream.push(data);
    if (logger) {
      logger.write({type: 'C->S', chunk: data, client: client});
    }
  });

  stream.on('error', function onError() {
    client.stop();
  });

  client.on('close', function onClose() {
    stream.end();
    stream.emit('close');
    stream.emit('end');
    stream.emit('finish');
  });

  return stream;
}
