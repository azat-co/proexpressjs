var extend = require('util')._extend;
var inherits = require('util').inherits;
var RemoteObjects = require('../');
var express = require('express');
var request = require('supertest');
var expect = require('chai').expect;
var factory = require('./helpers/shared-objects-factory.js');

describe('strong-remoting-rest', function(){
  var app;
  var server;
  var objects;
  var remotes;
  var adapterName = 'rest';
  
  before(function(done) {
    app = express();
    app.disable('x-powered-by');
    app.use(function (req, res, next) {
      // create the handler for each request
      objects.handler(adapterName).apply(objects, arguments);
    });
    server = app.listen(done);
  });

  // setup
  beforeEach(function(){
    if (process.env.NODE_ENV === 'production') {
      process.env.NODE_ENV = 'test';
    }
    objects = RemoteObjects.create({json: {limit: '1kb'},
      errorHandler: {disableStackTrace: false}});
    remotes = objects.exports;
    
    // connect to the app
    objects.connect('http://localhost:' + server.address().port, adapterName);
  });

  function json(method, url) {
    if (url === undefined) {
      url = method;
      method = 'get';
    }

    return request(app)[method](url)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/);
  }

  describe('remoting options', function(){
    // The 1kb limit is set by RemoteObjects.create({json: {limit: '1kb'}});
    it('should reject json payload larger than 1kb', function(done) {
      var method = givenSharedStaticMethod(
        function greet(msg, cb) {
          cb(null, msg);
        },
        {
          accepts: { arg: 'person', type: 'string', http: {source: 'body'} },
          returns: { arg: 'msg', type: 'string' }
        }
      );

      // Build an object that is larger than 1kb
      var name = "";
      for (var i = 0; i < 2048; i++) {
        name += "11111111111";
      }

      request(app)['post'](method.url)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send(name)
        .expect(413, done);
    });

    it('should support cors', function(done) {
      var method = givenSharedStaticMethod(
        function greet(msg, cb) {
          cb(null, msg);
        },
        {
          accepts: { arg: 'person', type: 'string', http: {source: 'body'} },
          returns: { arg: 'msg', type: 'string' }
        }
      );

      // Build an object that is larger than 1kb
      var name = {person: 'ABC'};

      request(app)['post'](method.url)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('Origin', 'http://localhost:3000')
        .send(name)
        .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
        .expect('Access-Control-Allow-Credentials', 'true')
        .expect(200, done);
    });

    it('should disable stack trace', function(done) {
      objects.options.errorHandler.disableStackTrace = true;
      var method = givenSharedStaticMethod(
        function(cb) {
          cb(new Error('test-error'));
        }
      );

      // Send a plain, non-json request to make sure the error handler
      // always returns a json response.
      request(app).get(method.url)
        .expect('Content-Type', /json/)
        .expect(500)
        .end(expectErrorResponseContaining({message: 'test-error'}, ['stack'], done));
    });

    it('should disable stack trace', function(done) {
      process.env.NODE_ENV = 'production';
      var method = givenSharedStaticMethod(
        function(cb) {
          cb(new Error('test-error'));
        }
      );

      // Send a plain, non-json request to make sure the error handler
      // always returns a json response.
      request(app).get(method.url)
        .expect('Content-Type', /json/)
        .expect(500)
        .end(expectErrorResponseContaining({message: 'test-error'}, ['stack'], done));
    });

  });

  describe('call of constructor method', function(){
    it('should work', function(done) {
      var method = givenSharedStaticMethod(
        function greet(msg, cb) {
          cb(null, msg);
        },
        {
          accepts: { arg: 'person', type: 'string' },
          returns: { arg: 'msg', type: 'string' }
        }
      );

      json(method.url + '?person=hello')
        .expect(200, { msg: 'hello' }, done);
    });

    it('should allow arguments in the path', function(done) {
      var method = givenSharedStaticMethod(
        function bar(a, b, cb) {
          cb(null, a + b);
        },
        {
          accepts: [
            { arg: 'b', type: 'number' },
            { arg: 'a', type: 'number', http: {source: 'path' } }
          ],
          returns: { arg: 'n', type: 'number' },
          http: { path: '/:a' }
        }
      );

      json(method.classUrl +'/1?b=2')
        .expect({ n: 3 }, done);
    });

    it('should allow arguments in the query', function(done) {
      var method = givenSharedStaticMethod(
        function bar(a, b, cb) {
          cb(null, a + b);
        },
        {
          accepts: [
            { arg: 'b', type: 'number' },
            { arg: 'a', type: 'number', http: {source: 'query' } }
          ],
          returns: { arg: 'n', type: 'number' },
          http: { path: '/' }
        }
      );

      json(method.classUrl +'/?a=1&b=2')
        .expect({ n: 3 }, done);
    });

    it('should allow string[] arg in the query', function(done) {
      var method = givenSharedStaticMethod(
        function bar(a, b, cb) {
          console.log(a, b, typeof b);
          cb(null, b.join('') + a);
        },
        {
          accepts: [
            { arg: 'a', type: 'string' },
            { arg: 'b', type: ['string'], http: {source: 'query' } }
          ],
          returns: { arg: 'n', type: 'string' },
          http: { path: '/' }
        }
      );

      json(method.classUrl +'/?a=z&b[0]=x&b[1]=y')
        .expect({ n: 'xyz' }, done);
    });

    it('should allow custom argument functions', function(done) {
      var method = givenSharedStaticMethod(
        function bar(a, b, cb) {
          cb(null, a + b);
        },
        {
          accepts: [
            { arg: 'b', type: 'number' },
            { arg: 'a', type: 'number', http: function(ctx) {
              return ctx.req.query.a;
            } }
          ],
          returns: { arg: 'n', type: 'number' },
          http: { path: '/' }
        }
      );

      json(method.classUrl +'/?a=1&b=2')
        .expect({ n: 3 }, done);
    });

    it('should pass undefined if the argument is not supplied', function (done) {
      var called = false;
      var method = givenSharedStaticMethod(
        function bar(a, cb) {
          called = true;
          assert(a === undefined, 'a should be undefined');
          cb();
        },
        {
          accepts: [
            { arg: 'b', type: 'number' }
          ]
        }
      );

      json(method.url).end(function() {
        assert(called);
        done();
      });
    });

    it('should allow arguments in the body', function(done) {
      var method = givenSharedStaticMethod(
        function bar(a, cb) {
          cb(null, a);
        },
        {
          accepts: [
            { arg: 'a', type: 'object', http: {source: 'body' }  }
          ],
          returns: { arg: 'data', type: 'object', root: true },
          http: { path: '/' }
        }
      );

      request(app)['post'](method.classUrl)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send('{"x": 1, "y": "Y"}')
        .expect('Content-Type', /json/)
        .expect(200, function(err, res){
          expect(res.body).to.deep.equal({"x": 1, "y": "Y"});
          done(err, res);
        });
    });

    it('should allow arguments in the body with date', function(done) {
      var method = givenSharedStaticMethod(
        function bar(a, cb) {
          cb(null, a);
        },
        {
          accepts: [
            { arg: 'a', type: 'object', http: {source: 'body' }  }
          ],
          returns: { arg: 'data', type: 'object', root: true },
          http: { path: '/' }
        }
      );

      var data = {date: {$type: 'date', $data: new Date()}};
      request(app)['post'](method.classUrl)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send(data)
        .expect('Content-Type', /json/)
        .expect(200, function(err, res){
          expect(res.body).to.deep.equal({date: data.date.$data.toISOString()});
          done(err, res);
      });
    });

    it('should allow arguments in the form', function(done) {
      var method = givenSharedStaticMethod(
        function bar(a, b, cb) {
          cb(null, a + b);
        },
        {
          accepts: [
            { arg: 'b', type: 'number', http: {source: 'form' }  },
            { arg: 'a', type: 'number', http: {source: 'form' } }
          ],
          returns: { arg: 'n', type: 'number' },
          http: { path: '/' }
        }
      );

      request(app)['post'](method.classUrl)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('a=1&b=2')
        .expect('Content-Type', /json/)
        .expect({ n: 3 }, done);
    });

    it('should allow arguments from http req and res', function(done) {
      var method = givenSharedStaticMethod(
        function bar(req, res, cb) {
          res.status(200).send(req.body);
        },
        {
          accepts: [
            { arg: 'req', type: 'object', http: {source: 'req' }  },
            { arg: 'res', type: 'object', http: {source: 'res' }  }
          ],
          http: { path: '/' }
        }
      );

      request(app)['post'](method.classUrl)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send('{"x": 1, "y": "Y"}')
        .expect('Content-Type', /json/)
        .expect(200, function(err, res){
          expect(res.body).to.deep.equal({"x": 1, "y": "Y"});
          done(err, res);
        });
    });

    it('should allow arguments from http context', function(done) {
      var method = givenSharedStaticMethod(
        function bar(ctx, cb) {
          ctx.res.status(200).send(ctx.req.body);
        },
        {
          accepts: [
            { arg: 'ctx', type: 'object', http: {source: 'context' }  }
          ],
          http: { path: '/' }
        }
      );

      request(app)['post'](method.classUrl)
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send('{"x": 1, "y": "Y"}')
        .expect('Content-Type', /json/)
        .expect(200, function(err, res){
          expect(res.body).to.deep.equal({"x": 1, "y": "Y"});
          done(err, res);
        });
    });

    it('should respond with 204 if returns is not defined', function(done) {
      var method = givenSharedStaticMethod(
        function(cb) { cb(null, 'value-to-ignore'); }
      );

      json(method.url)
        .expect(204, done);
    });

    it('should respond with named results if returns has multiple args', function(done) {
      var method = givenSharedStaticMethod(
        function(a, b, cb) {
          cb(null, a, b);
        },
        {
          accepts: [
            { arg: 'a', type: 'number' },
            { arg: 'b', type: 'number' }
          ],
          returns: [
            { arg: 'a', type: 'number' },
            { arg: 'b', type: 'number' }
          ]
        }
      );

      json(method.url + '?a=1&b=2')
        .expect({a: 1, b: 2}, done);
    });

    it('should remove any X-Powered-By header to LoopBack', function(done) {
      var method = givenSharedStaticMethod(
        function(cb) { cb(null, 'value-to-ignore'); }
      );

      json(method.url)
        .expect(204)
        .end(function(err,result){

          expect(result.headers).not.to.have.keys(['x-powered-by']);
          done();
      });
    });

    it('should report error for mismatched arg type', function(done) {
      remotes.foo = {
        bar: function (a, fn) {
          fn(null, a);
        }
      };

      var fn = remotes.foo.bar;

      fn.shared = true;
      fn.accepts = [
        {arg: 'a', type: 'object'}
      ];
      fn.returns = {root: true};

      json('get', '/foo/bar?a=foo')
        .expect(500, done);
    });

    it('should coerce boolean strings - true', function(done) {
      remotes.foo = {
        bar: function (a, fn) {
          fn(null, a);
        }
      };

      var fn = remotes.foo.bar;

      fn.shared = true;
      fn.accepts = [
        {arg: 'a', type: 'object'}
      ];
      fn.returns = {root: true};

      json('get', '/foo/bar?a[foo]=true')
        .expect({foo: true}, done);
    });

    it('should coerce boolean strings - false', function(done) {
      remotes.foo = {
        bar: function (a, fn) {
          fn(null, a);
        }
      };

      var fn = remotes.foo.bar;

      fn.shared = true;
      fn.accepts = [
        {arg: 'a', type: 'object'},
      ];
      fn.returns = {root: true};

      json('get', '/foo/bar?a[foo]=false')
        .expect({foo: false}, done);
    });

    it('should coerce number strings', function(done) {
      remotes.foo = {
        bar: function (a, b, fn) {
          fn(null, a + b);
        }
      };

      var fn = remotes.foo.bar;

      fn.shared = true;
      fn.accepts = [
        {arg: 'a', type: 'number'},
        {arg: 'b', type: 'number'}
      ];
      fn.returns = {root: true};

      json('get', '/foo/bar?a=42&b=0.42')
        .expect(200, function (err, res) {
          assert.equal(res.body, 42.42);
          done();
        });
    });

    it('should allow empty body for json request', function(done) {
      remotes.foo = {
        bar: function (a, b, fn) {
          fn(null, a, b);
        }
      };

      var fn = remotes.foo.bar;

      fn.shared = true;
      fn.accepts = [
        {arg: 'a', type: 'number'},
        {arg: 'b', type: 'number'}
      ];

      fn.returns = [
        {arg: 'a', type: 'number'},
        {arg: 'b', type: 'number'}
      ];

      json('post', '/foo/bar?a=1&b=2').set('Content-Length', 0)
        .expect({a: 1, b: 2}, done);
    });

    it('should call rest hooks', function(done) {
      var hooksCalled = [];

      var method = givenSharedStaticMethod({
        rest: {
          before: createHook('beforeRest'),
          after: createHook('afterRest')
        }
      });

      objects.before(method.name, createHook('beforeRemote'));
      objects.after(method.name, createHook('afterRemote'));

      json(method.url)
        .end(function(err) {
          if (err) done(err);
          assert.deepEqual(
            hooksCalled,
            ['beforeRest', 'beforeRemote', 'afterRemote', 'afterRest']
          );
          done();
        });

      function createHook(name) {
        return function(ctx, next) {
          hooksCalled.push(name);
          next();
        };
      }
    });

    describe('uncaught errors', function () {
      it('should return 500 if an error object is thrown', function (done) {
        remotes.shouldThrow = {
          bar: function (fn) {
            throw new Error('an error');
            fn(null);
          }
        };

        var fn = remotes.shouldThrow.bar;
        fn.shared = true;

        json('get', '/shouldThrow/bar?a=1&b=2')
          .expect(500)
          .end(expectErrorResponseContaining({message: 'an error'}, done));
      });

      it('should return 500 if an error string is thrown', function (done) {
        remotes.shouldThrow = {
          bar: function (fn) {
            throw 'an error';
            fn(null);
          }
        };

        var fn = remotes.shouldThrow.bar;
        fn.shared = true;

        json('get', '/shouldThrow/bar?a=1&b=2')
          .expect(500)
          .end(expectErrorResponseContaining({message: 'an error'}, done));
      });
    });

    it('should return 500 when method returns an error', function(done) {
      var method = givenSharedStaticMethod(
        function(cb) {
          cb(new Error('test-error'));
        }
      );

      // Send a plain, non-json request to make sure the error handler
      // always returns a json response.
      request(app).get(method.url)
        .expect('Content-Type', /json/)
        .expect(500)
        .end(expectErrorResponseContaining({message: 'test-error'}, done));
    });

    it('should return 500 when "before" returns an error', function(done) {
      var method = givenSharedStaticMethod();
      objects.before(method.name, function(ctx, next) {
        next(new Error('test-error'));
      });

      json(method.url)
        .expect(500)
        .end(expectErrorResponseContaining({message: 'test-error'}, done));
    });

    it('should return 500 when "after" returns an error', function(done) {
      var method = givenSharedStaticMethod();
      objects.after(method.name, function(ctx, next) {
        next(new Error('test-error'));
      });

      json(method.url)
        .expect(500)
        .end(expectErrorResponseContaining({message: 'test-error'}, done));
    });

    it('should return 400 when a required arg is missing', function (done) {
      var method = givenSharedPrototypeMethod(
        function(a, cb) {
          cb();
        },
        {
          accepts: [
            { arg: 'a', type: 'number', required: true }
          ]
        }
      );

      json(method.url)
        .expect(400, done);
    });
  });

  describe('call of prototype method', function(){
    it('should work', function(done) {
      var method = givenSharedPrototypeMethod(
        function greet(msg, cb) {
          cb(null, this.id + ':' + msg);
        },
        {
          accepts: { arg: 'person', type: 'string' },
          returns: { arg: 'msg', type: 'string' }
        }
      );

      json(method.getUrlForId('world') + '?person=hello')
        .expect(200, { msg: 'world:hello' }, done);
    });

    it('should have the correct scope', function(done) {
      var method = givenSharedPrototypeMethod(
        function greet(msg, cb) {
          assert.equal(this.constructor, method.ctor);
          cb(null, this.id + ':' + msg);
        },
        {
          accepts: { arg: 'person', type: 'string' },
          returns: { arg: 'msg', type: 'string' }
        }
      );

      json(method.getUrlForId('world') + '?person=hello')
        .expect(200, { msg: 'world:hello' }, done);
    });

    it('should allow arguments in the path', function(done) {
      var method = givenSharedPrototypeMethod(
        function bar(a, b, cb) {
          cb(null, this.id + ':' + (a + b));
        },
        {
          accepts: [
            { arg: 'b', type: 'number' },
            { arg: 'a', type: 'number', http: {source: 'path' } }
          ],
          returns: { arg: 'n', type: 'number' },
          http: { path: '/:a' }
        }
      );

      json(method.getClassUrlForId('sum') +'/1?b=2')
        .expect({ n: 'sum:3' }, done);
    });

    it('should allow jsonp requests', function (done) {
      var method = givenSharedStaticMethod(
        function bar(a, cb) {
          cb(null, a);
        },
        {
          accepts: [
            { arg: 'a', type: 'number', http: {source: 'path'} }
          ],
          returns: { arg: 'n', type: 'number', root: true},
          http: { path: '/:a' }
        }
      );

      request(app)['get'](method.classUrl + '/1?callback=boo')
        .set('Accept', 'application/javascript')
        .expect('Content-Type', /javascript/)
        .expect('/**/ typeof boo === \'function\' && boo(1);', done);
    });

    it('should allow jsonp requests with null response', function (done) {
      var method = givenSharedStaticMethod(
        function bar(a, cb) {
          cb(null, null);
        },
        {
          accepts: [
            { arg: 'a', type: 'number', http: {source: 'path'} }
          ],
          returns: { arg: 'n', type: 'number', root: true},
          http: { path: '/:a' }
        }
      );

      request(app)['get'](method.classUrl + '/1?callback=boo')
        .set('Accept', 'application/javascript')
        .expect('Content-Type', /javascript/)
        .expect('/**/ typeof boo === \'function\' && boo(null);', done);
    });

    it('should allow arguments in the query', function(done) {
      var method = givenSharedPrototypeMethod(
        function bar(a, b, cb) {
          cb(null, this.id + ':' + (a + b));
        },
        {
          accepts: [
            { arg: 'b', type: 'number' },
            { arg: 'a', type: 'number', http: {source: 'query' } }
          ],
          returns: { arg: 'n', type: 'number' },
          http: { path: '/' }
        }
      );

      json(method.getClassUrlForId('sum') +'/?b=2&a=1')
        .expect({ n: 'sum:3' }, done);
    });

    it('should support methods on `/` path', function(done) {
      var method = givenSharedPrototypeMethod({
        http: { path: '/', verb: 'get'}
      });

      json('get', method.getClassUrlForId(0))
        .expect(204) // 204 No Content
        .end(done);
    });

    it('should respond with 204 if returns is not defined', function(done) {
      var method = givenSharedPrototypeMethod(
        function(cb) { cb(null, 'value-to-ignore'); }
      );

      json(method.getUrlForId('an-id'))
        .expect(204, done);
    });

    it('should respond with named results if returns has multiple args', function(done) {
      var method = givenSharedPrototypeMethod(
        function(a, b, cb) {
          cb(null, this.id, a, b);
        },
        {
          accepts: [
            { arg: 'a', type: 'number' },
            { arg: 'b', type: 'number' }
          ],
          returns: [
            { arg: 'id', type: 'any' },
            { arg: 'a', type: 'number' },
            { arg: 'b', type: 'number' }
          ]
        }
      );

      json(method.getUrlForId('an-id') + '?a=1&b=2')
        .expect({ id: 'an-id', a: 1, b: 2 }, done);
    });

    it('should return 500 when method returns an error', function(done) {
      var method = givenSharedPrototypeMethod(
        function(cb) {
          cb(new Error('test-error'));
        }
      );

      json(method.url)
        .expect(500)
        .end(expectErrorResponseContaining({message: 'test-error'}, done));
    });

    it('should return 500 when "before" returns an error', function(done) {
      var method = givenSharedPrototypeMethod();
      objects.before(method.name, function(ctx, next) {
        next(new Error('test-error'));
      });

      json(method.url)
        .expect(500)
        .end(expectErrorResponseContaining({message: 'test-error'}, done));
    });

    it('should return 500 when "after" returns an error', function(done) {
      var method = givenSharedPrototypeMethod();
      objects.after(method.name, function(ctx, next) {
        next(new Error('test-error'));
      });

      json(method.url)
        .expect(500)
        .end(expectErrorResponseContaining({message: 'test-error'}, done));
    });
  });

  it('returns 404 for unknown method of a shared class', function(done) {
    var classUrl = givenSharedStaticMethod().classUrl;

    json(classUrl + '/unknown-method')
      .expect(404, done);
  });

  it('returns 404 with standard JSON body for uknown URL', function(done) {
    json('/unknown-url')
      .expect(404)
      .end(expectErrorResponseContaining({status: 404}, done));
  });

  it('returns correct error response body', function(done) {
    function TestError() {
      Error.captureStackTrace(this, TestError);
      this.name = 'TestError';
      this.message = 'a test error';
      this.status = 444;
      this.aCustomProperty = 'a-custom-value';
    }
    inherits(TestError, Error);

    var method = givenSharedStaticMethod(function(cb) { cb(new TestError()); });

    json(method.url)
      .expect(444)
      .end(function(err, result) {
        if (err) done(err);
        expect(result.body).to.have.keys(['error']);
        var expected = {
          name: 'TestError',
          status: 444,
          message: 'a test error',
          aCustomProperty: 'a-custom-value'
        };
        for (var prop in expected) {
          expect(result.body.error[prop], prop).to.equal(expected[prop]);
        }
        expect(result.body.error.stack, 'stack').to.contain(__filename);
        done();
      });
  });

  describe('client', function() {

    describe('call of constructor method', function(){
      it('should work', function(done) {
        var method = givenSharedStaticMethod(
          function greet(msg, cb) {
            cb(null, msg);
          },
          {
            accepts: { arg: 'person', type: 'string' },
            returns: { arg: 'msg', type: 'string' }
          }
        );
        
        var msg = 'hello';
        objects.invoke(method.name, [msg], function(err, resMsg) {
          assert.equal(resMsg, msg);
          done();
        });
      });

      it('should allow arguments in the path', function(done) {
        var method = givenSharedStaticMethod(
          function bar(a, b, cb) {
            cb(null, a + b);
          },
          {
            accepts: [
              { arg: 'b', type: 'number' },
              { arg: 'a', type: 'number', http: {source: 'path' } }
            ],
            returns: { arg: 'n', type: 'number' },
            http: { path: '/:a' }
          }
        );

        objects.invoke(method.name, [1, 2], function(err, n) {
          assert.equal(n, 3);
          done();
        });  
      });

      it('should allow arguments in the query', function(done) {
        var method = givenSharedStaticMethod(
          function bar(a, b, cb) {
            cb(null, a + b);
          },
          {
            accepts: [
              { arg: 'b', type: 'number' },
              { arg: 'a', type: 'number', http: {source: 'query' } }
            ],
            returns: { arg: 'n', type: 'number' },
            http: { path: '/' }
          }
        );
        
        objects.invoke(method.name, [1, 2], function(err, n) {
          assert.equal(n, 3);
          done();
        });
      });

      it('should pass undefined if the argument is not supplied', function (done) {
        var called = false;
        var method = givenSharedStaticMethod(
          function bar(a, cb) {
            called = true;
            assert(a === undefined, 'a should be undefined');
            cb();
          },
          {
            accepts: [
              { arg: 'b', type: 'number' }
            ]
          }
        );
        
        objects.invoke(method.name, [], function(err) {
          assert(called);
          done();
        });
      });

      it('should allow arguments in the body', function(done) {
        var method = givenSharedStaticMethod(
          function bar(a, cb) {
            cb(null, a);
          },
          {
            accepts: [
              { arg: 'a', type: 'object', http: {source: 'body' }  }
            ],
            returns: { arg: 'data', type: 'object', root: true },
            http: { path: '/' }
          }
        );
        
        var obj = {
          foo: 'bar'
        };

        objects.invoke(method.name, [obj], function(err, data) {
          expect(obj).to.deep.equal(data);
          done();
        });
      });

      it('should allow arguments in the body with date', function(done) {
        var method = givenSharedStaticMethod(
          function bar(a, cb) {
            cb(null, a);
          },
          {
            accepts: [
              { arg: 'a', type: 'object', http: {source: 'body' }  }
            ],
            returns: { arg: 'data', type: 'object', root: true },
            http: { path: '/' }
          }
        );

        var data = {date: {$type: 'date', $data: new Date()}};
        objects.invoke(method.name, [data], function(err, resData) {
          expect(resData).to.deep.equal({date: data.date.$data.toISOString()});
          done();
        });
      });

      it('should allow arguments in the form', function(done) {
        var method = givenSharedStaticMethod(
          function bar(a, b, cb) {
            cb(null, a + b);
          },
          {
            accepts: [
              { arg: 'b', type: 'number', http: {source: 'form' }  },
              { arg: 'a', type: 'number', http: {source: 'form' } }
            ],
            returns: { arg: 'n', type: 'number' },
            http: { path: '/' }
          }
        );
        
        objects.invoke(method.name, [1, 2], function(err, n) {
          assert.equal(n, 3);
          done();
        });
      });

      it('should respond with correct args if returns has multiple args', function(done) {
        var method = givenSharedStaticMethod(
          function(a, b, cb) {
            cb(null, a, b);
          },
          {
            accepts: [
              { arg: 'a', type: 'number' },
              { arg: 'b', type: 'number' }
            ],
            returns: [
              { arg: 'a', type: 'number' },
              { arg: 'b', type: 'number' }
            ]
          }
        );

        objects.invoke(method.name, [1, 2], function(err, a, b) {
          assert.equal(a, 1);
          assert.equal(b, 2);
          done();
        });
      });
      
      describe('uncaught errors', function () {
        it('should return 500 if an error object is thrown', function (done) {
          var errMsg = 'an error';
          var method = givenSharedStaticMethod(
            function(a, b, cb) {
              throw new Error(errMsg);
            }
          );
          
          objects.invoke(method.name, function(err) {
            assert(err instanceof Error);
            assert.equal(err.message, errMsg);
            done();
          });
        });
      });
    });
  });

  function givenSharedStaticMethod(fn, config) {
    if (typeof fn === 'object' && config === undefined) {
      config = fn;
      fn = null;
    }
    fn = fn || function(cb) { cb(); };

    remotes.testClass = { testMethod: fn };
    config = extend({ shared: true }, config);
    extend(remotes.testClass.testMethod, config);
    return {
      name: 'testClass.testMethod',
      url: '/testClass/testMethod',
      classUrl: '/testClass'
    };
  }

  function givenSharedPrototypeMethod(fn, config) {
    if (typeof fn === 'object' && config === undefined) {
      config = fn;
      fn = undefined;
    }

    fn = fn || function(cb) { cb(); };
    remotes.testClass = factory.createSharedClass();
    remotes.testClass.prototype.testMethod = fn;
    config = extend({ shared: true }, config);
    extend(remotes.testClass.prototype.testMethod, config);
    return {
      name: 'testClass.prototype.testMethod',
      getClassUrlForId: function(id) {
        return '/testClass/' + id;
      },
      getUrlForId: function(id) {
        return this.getClassUrlForId(id) + '/testMethod';
      },
      url: '/testClass/an-id/testMethod',
      ctor: remotes.testClass
    };
  }

  function expectErrorResponseContaining(keyValues, excludedKeyValues, done) {
    if(done === undefined && typeof excludedKeyValues === 'function') {
      done = excludedKeyValues;
      excludedKeyValues = {};
    }
    return function(err, resp) {
      if (err) return done(err);
      for (var prop in keyValues) {
        expect(resp.body.error).to.have.property(prop, keyValues[prop]);
      }
      for (var i = 0, n = excludedKeyValues.length; i < n; i++) {
        expect(resp.body.error).to.not.have.property(excludedKeyValues[i]);
      }
      done();
    };
  }

  it('should skip the super class and only expose user defined remote methods',
    function (done) {

      function base() {
      }

      function foo() {
      }

      foo.bar = function() {
      };

      foo.bar.shared = true;

      inherits(foo, base);
      base.shared = true;
      foo.shared = true;

      foo.sharedCtor = function() {};

      remotes.foo = foo;

      var methodNames = [];
      var methods = objects.methods();

      for (var i = 0; i < methods.length; i++) {
        methodNames.push(methods[i].stringName);
      }

      expect(methodNames).not.to.contain('super_');
      expect(methodNames).to.contain('foo.bar');
      expect(methodNames.length).to.equal(1);
      done();

  });

});
