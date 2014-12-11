var loopback = require('loopback');
var explorer = require('../');
var request = require('supertest');
var assert = require('assert');
var expect = require('chai').expect;

describe('explorer', function() {

  describe('with default config', function() {
    beforeEach(givenLoopBackAppWithExplorer());

    it('should redirect to /explorer/', function(done) {
      request(this.app)
        .get('/explorer')
        .expect(303)
        .end(done);
    });

    it('should serve the explorer at /explorer/', function(done) {
      request(this.app)
        .get('/explorer/')
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;

          assert(!!~res.text.indexOf('<title>StrongLoop API Explorer</title>'), 
            'text does not contain expected string');
          done();
        });
    });

    it('should serve correct swagger-ui config', function(done) {
      request(this.app)
        .get('/explorer/config.json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to
            .have.property('url', '/explorer/resources');
          done();
        });
    });
  });

  describe('with custom explorer base', function() {
    beforeEach(givenLoopBackAppWithExplorer('/swagger'));

    it('should serve correct swagger-ui config', function(done) {
      request(this.app)
        .get('/swagger/config.json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to
            .have.property('url', '/swagger/resources');
          done();
        });
    });
  });

  describe('with custom app.restApiRoot', function() {
    it('should serve correct swagger-ui config', function(done) {
      var app = loopback();
      app.set('restApiRoot', '/rest-api-root');
      configureRestApiAndExplorer(app);

      request(app)
        .get('/explorer/config.json')
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to
            .have.property('url', '/explorer/resources');
          done();
        });
    });
  });

  function givenLoopBackAppWithExplorer(explorerBase) {
    return function(done) {
      var app = this.app = loopback();
      configureRestApiAndExplorer(app, explorerBase);
      done();
    };
  }

  function configureRestApiAndExplorer(app, explorerBase) {
    var Product = loopback.Model.extend('product');
    Product.attachTo(loopback.memory());
    app.model(Product);

    app.use(explorerBase || '/explorer', explorer(app));
    app.use(app.get('restApiRoot') || '/', loopback.rest());
  }
});
