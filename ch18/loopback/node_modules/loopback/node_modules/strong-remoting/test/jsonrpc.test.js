var RemoteObjects = require('../');
var express = require('express');
var request = require('supertest');

describe('strong-remoting-jsonrpc', function () {
  var app;
  var server;
  var objects;
  var remotes;

  // setup
  beforeEach(function () {
    if (server) server.close();
    objects = RemoteObjects.create({json: {limit: '1kb'}});
    remotes = objects.exports;
    app = express();
  });

  function jsonrpc(url, method, parameters) {
    return request(app)['post'](url)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({"jsonrpc": "2.0", "method": method, "params": parameters, "id": 1})
      .expect(200)
      .expect('Content-Type', /json/);
  }

  describe('handlers', function () {
    describe('jsonrpc', function () {
      beforeEach(function () {
        app.use(function (req, res, next) {
          // create the handler for each request
          objects.handler('jsonrpc').apply(objects, arguments);
        });
        function greet(msg, fn) {
          fn(null, msg);
        }

        remotes.user = {
          greet: greet
        };

        greet.shared = true;
      });

      it('should support calling object methods', function (done) {

        jsonrpc('/user/jsonrpc', 'greet', ['JS'])
          .expect({"jsonrpc": "2.0", "id": 1, "result": "JS"}, done);
      });

      it('should report error for non-existent methods', function (done) {

        jsonrpc('/user/jsonrpc', 'greet1', ['JS'])
          .expect({
            "jsonrpc": "2.0",
            "id": 1,
            "error": {
              "code": -32601,
              "message": "Method not found"
            }
          }, done);
      });

      // The 1kb limit is set by RemoteObjects.create({json: {limit: '1kb'}});
      it('should reject json payload larger than 1kb', function (done) {

        // Build an object that is larger than 1kb
        var name = "";
        for (var i = 0; i < 2048; i++) {
          name += "11111111111";
        }

        jsonrpc('/user/jsonrpc', 'greet', [name])
          .expect(413, done);
      });
    });
  });
});
