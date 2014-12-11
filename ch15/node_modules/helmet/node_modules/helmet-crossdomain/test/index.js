var crossdomain = require('..');

var assert = require('assert');
var connect = require('connect');
var request = require('supertest');

var POLICY = '<?xml version="1.0"?>' +
  '<!DOCTYPE cross-domain-policy SYSTEM "http://www.adobe.com/xml/dtds/cross-domain-policy.dtd">' +
  '<cross-domain-policy>' +
  '<site-control permitted-cross-domain-policies="none"/>' +
  '</cross-domain-policy>';

describe('crossdomain', function () {

  function helloWorld(req, res) {
    res.end('Hello world!');
  }

  var app;
  beforeEach(function () {
    app = connect();
    app.use(crossdomain());
    app.use(helloWorld);
  });

  function expectPolicy(uri, done) {
    request(app).get(uri)
    .expect(POLICY)
    .expect(200, done);
  }

  function expectHello(uri, done) {
    request(app).get('/')
    .expect('Hello world!', done);
  }

  function test(uri) {
    it('responds with proper XML visiting ' + uri, function (done) {
      expectPolicy(uri, done);
    });
  }

  it('preserves normal responses', function (done) {
    expectHello('/', done);
  });

  test('/crossdomain.xml');
  test('/crossdomain.XML');
  test('/CrossDomain.xml');
  test('/CROSSDOMAIN.xml');
  test('/CROSSDOMAIN.XML');
  test('/crossdomain.xml?');
  test('/crossdomain.xml?foo=123&bar=456');

  it('can be forced to be case-sensitive in the middleware', function (done) {

    var testsRemaining = 7;
    function finished(err) {
      if (err) {
        done(err);
        return;
      }
      testsRemaining -= 1;
      if (testsRemaining === 0) {
        done();
      }
    }

    app = connect();
    app.use(crossdomain({ caseSensitive: true }));
    app.use(helloWorld);

    expectPolicy('/crossdomain.xml', finished);
    expectPolicy('/crossdomain.xml?CAPITALIZED=ARGUMENTS', finished);
    expectHello('/crossdomain.XML', finished);
    expectHello('/CrossDomain.xml', finished);
    expectHello('/CROSSDOMAIN.xml', finished);
    expectHello('/CROSSDOMAIN.XML', finished);
    expectHello('/CROSSDOMAIN.XML?foo=bar', finished);

  });

  it('names its function and middleware', function () {
    assert.equal(crossdomain.name, 'crossdomain');
    assert.equal(crossdomain().name, 'crossdomain');
  });

});
