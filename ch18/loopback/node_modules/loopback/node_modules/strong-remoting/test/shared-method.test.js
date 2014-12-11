var extend = require('util')._extend;
var expect = require('chai').expect;
var SharedMethod = require('../lib/shared-method');
var factory = require('./helpers/shared-objects-factory.js');

describe('SharedMethod', function() {
  describe('sharedMethod.isDelegateFor(suspect, [isStatic])', function () {

    // stub function
    function myFunction() {};

    it('checks if the given function is going to be invoked', function () {
      var mockSharedClass = {};
      var sharedMethod = new SharedMethod(myFunction, 'myName', mockSharedClass);
      assert.equal(sharedMethod.isDelegateFor(myFunction), true);
    });
    
    it('checks by name if a function is going to be invoked', function () {
      var mockSharedClass = { prototype: { myName: myFunction } };
      var sharedMethod = new SharedMethod(myFunction, 'myName', mockSharedClass);
      assert.equal(sharedMethod.isDelegateFor('myName', false), true);
      assert.equal(sharedMethod.isDelegateFor('myName', true), false);
      assert.equal(sharedMethod.isDelegateFor('myName'), true);
    });
    
    it('checks by name if static function is going to be invoked', function () {
      var mockSharedClass = { myName: myFunction };
      var options = { isStatic: true };
      var sharedMethod = new SharedMethod(myFunction, 'myName', mockSharedClass, options);
      assert.equal(sharedMethod.isDelegateFor('myName', true), true);
      assert.equal(sharedMethod.isDelegateFor('myName', false), false);
    });
    
    it('checks by alias if static function is going to be invoked', function () {
      var mockSharedClass = { myName: myFunction };
      var options = { isStatic: true, aliases: ['myAlias'] };
      var sharedMethod = new SharedMethod(myFunction, 'myName', mockSharedClass, options);
      assert.equal(sharedMethod.isDelegateFor('myAlias', true), true);
      assert.equal(sharedMethod.isDelegateFor('myAlias', false), false);
    });
  });
});
