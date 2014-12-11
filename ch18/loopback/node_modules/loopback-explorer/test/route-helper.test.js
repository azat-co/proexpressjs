'use strict';

var routeHelper = require('../lib/route-helper');
var expect = require('chai').expect;
var _defaults = require('lodash.defaults');

describe('route-helper', function() {
  it('returns "object" when a route has multiple return values', function() {
    var doc = createAPIDoc({
      returns: [
        { arg: 'max', type: 'number' },
        { arg: 'min', type: 'number' },
        { arg: 'avg', type: 'number' }
      ]
    });
    expect(doc.operations[0].type).to.equal('object');
  });

  it('converts path params when they exist in the route name', function() {
    var doc = createAPIDoc({
      accepts: [
        {arg: 'id', type: 'string'}
      ],
      path: '/test/:id'
    });
    var paramDoc = doc.operations[0].parameters[0];
    expect(paramDoc.paramType).to.equal('path');
    expect(paramDoc.name).to.equal('id');
    expect(paramDoc.required).to.equal(false);
  });

  // FIXME need regex in routeHelper.acceptToParameter
  xit('won\'t convert path params when they don\'t exist in the route name', function() {
    var doc = createAPIDoc({
      accepts: [
        {arg: 'id', type: 'string'}
      ],
      path: '/test/:identifier'
    });
    var paramDoc = doc.operations[0].parameters[0];
    expect(paramDoc.paramType).to.equal('query');
  });

  it('correctly coerces param types', function() {
    var doc = createAPIDoc({
      accepts: [
        {arg: 'binaryData', type: 'buffer'}
      ]
    });
    var paramDoc = doc.operations[0].parameters[0];
    expect(paramDoc.paramType).to.equal('query');
    expect(paramDoc.type).to.equal('string');
    expect(paramDoc.format).to.equal('byte');
  });

  it('correctly converts return types (arrays)', function() {
    var doc = createAPIDoc({
      returns: [
        {arg: 'data', type: ['customType']}
      ]
    });
    var opDoc = doc.operations[0];
    expect(opDoc.type).to.equal('array');
    expect(opDoc.items).to.eql({type: 'customType'});
  });

  it('correctly converts return types (format)', function() {
    var doc = createAPIDoc({
      returns: [
        {arg: 'data', type: 'buffer'}
      ]
    });
    var opDoc = doc.operations[0];
    expect(opDoc.type).to.equal('string');
    expect(opDoc.format).to.equal('byte');
  });

});

// Easy wrapper around createRoute
function createAPIDoc(def) {
  return routeHelper.routeToAPIDoc(_defaults(def, {
    path: '/test',
    verb: 'GET',
    method: 'test.get'
  }));
}
