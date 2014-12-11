'use strict';

var url = require('url');
var urlJoin = require('../lib/url-join');
var loopback = require('loopback');
var express = require('express');
var swagger = require('../lib/swagger');

var request = require('supertest');
var expect = require('chai').expect;

describe('swagger definition', function() {
  describe('basePath', function() {
    // No basepath on resource doc in 1.2
    it('no longer exists on resource doc', function(done) {
      var app = mountSwagger();

      var getReq = getSwaggerResources(app);
      getReq.end(function(err, res) {
        if (err) return done(err);
        expect(res.body.basePath).to.equal(undefined);
        done();
      });
    });

    it('is "http://{host}/api" by default', function(done) {
      var app = mountSwagger();

      var getReq = getAPIDeclaration(app, 'products');
      getReq.end(function(err, res) {
        if (err) return done(err);
        expect(res.body.basePath).to.equal(url.resolve(getReq.url, '/api'));
        done();
      });
    });

    it('is "http://{host}/{basePath}" when basePath is a path', function(done){
      var app = mountSwagger({ basePath: '/api-root'});

      var getReq = getAPIDeclaration(app, 'products');
      getReq.end(function(err, res) {
        if (err) return done(err);
        var apiRoot = url.resolve(getReq.url, '/api-root');
        expect(res.body.basePath).to.equal(apiRoot);
        done();
      });
    });

    it('infers API basePath from app', function(done){
      var app = mountSwagger({}, {apiRoot: '/custom-api-root'});

      var getReq = getAPIDeclaration(app, 'products');
      getReq.end(function(err, res) {
        if (err) return done(err);
        var apiRoot = url.resolve(getReq.url, '/custom-api-root');
        expect(res.body.basePath).to.equal(apiRoot);
        done();
      });
    });

    it('is reachable when explorer mounting location is changed', function(done){
      var explorerRoot = '/erforscher';
      var app = mountSwagger({}, {explorerRoot: explorerRoot});

      var getReq = getSwaggerResources(app, explorerRoot, 'products');
      getReq.end(function(err, res) {
        if (err) return done(err);
        expect(res.body.basePath).to.be.a('string');
        done();
      });
    });

    it('respects a hardcoded protocol (behind SSL terminator)', function(done){
      var app = mountSwagger({protocol: 'https'});

      var getReq = getAPIDeclaration(app, 'products');
      getReq.end(function(err, res) {
        if (err) return done(err);
        var parsed = url.parse(res.body.basePath);
        expect(parsed.protocol).to.equal('https:');
        done();
      });
    });
  });

  describe('Model definition attributes', function() {
    it('Properly defines basic attributes', function(done) {
      var app = mountSwagger();

      var getReq = getAPIDeclaration(app, 'products');
      getReq.end(function(err, res) {
        if (err) return done(err);
        var data = res.body.models.product;
        expect(data.id).to.equal('product');
        expect(data.required.sort()).to.eql(['aNum', 'foo'].sort());
        expect(data.properties.foo.type).to.equal('string');
        expect(data.properties.bar.type).to.equal('string');
        expect(data.properties.aNum.type).to.equal('number');
        // These will be Numbers for Swagger 2.0
        expect(data.properties.aNum.minimum).to.equal('1');
        expect(data.properties.aNum.maximum).to.equal('10');
        // Should be Number even in 1.2
        expect(data.properties.aNum.defaultValue).to.equal(5);
        done();
      });
    });
  });

  function getSwaggerResources(app, restPath, classPath) {
    return request(app)
      .get(urlJoin(restPath || '/explorer', '/resources', classPath || ''))
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  }

  function getAPIDeclaration(app, className) {
    return getSwaggerResources(app, '', urlJoin('/', className));
  }

  function mountSwagger(options, addlOptions) {
    addlOptions = addlOptions || {};
    var app = createLoopbackAppWithModel(addlOptions.apiRoot);
    var swaggerApp = express();
    swagger(app, swaggerApp, options);
    app.use(addlOptions.explorerRoot || '/explorer', swaggerApp);
    return app;
  }

  function createLoopbackAppWithModel(apiRoot) {
    var app = loopback();

    var Product = loopback.Model.extend('product', {
      foo: {type: 'string', required: true},
      bar: 'string',
      aNum: {type: 'number', min: 1, max: 10, required: true, default: 5}
    });
    Product.attachTo(loopback.memory());
    app.model(Product);

    // Simulate a restApiRoot set in config
    app.set('restApiRoot', apiRoot || '/api');
    app.use(app.get('restApiRoot'), loopback.rest());

    return app;
  }
});
