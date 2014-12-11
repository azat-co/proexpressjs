var HttpInvocation = require('../lib/http-invocation');
var SharedMethod = require('../lib/shared-method');
var extend = require('util')._extend;
var expect = require('chai').expect;

describe('HttpInvocation', function() {
  describe('namedArgs', function() {
    
    function expectNamedArgs(accepts, inputArgs, expectedNamedArgs) {
      var method = givenSharedStaticMethod({
        accepts: accepts
      });
      var inv = new HttpInvocation(method, inputArgs);
      expect(inv.namedArgs).to.deep.equal(expectedNamedArgs);
    }
    
    it('should correctly name a single arg', function() {
      expectNamedArgs(
        [{arg: 'a', type: 'number'}],
        [1],
        {a: 1}
      );
    });
    
    it('should correctly name multiple args', function() {
      expectNamedArgs(
        [{arg: 'a', type: 'number'}, {arg: 'str', type: 'string'}], 
        [1, 'foo'],
        {a: 1, str: 'foo'}
      );
    });
    
    it('should correctly name multiple args when a partial set is provided', function() {
      expectNamedArgs(
        [{arg: 'a', type: 'number'}, {arg: 'str', type: 'string'}], 
        [1],
        {a: 1}
      );
    });
  });
});

function givenSharedStaticMethod(fn, config) {
  if (typeof fn === 'object' && config === undefined) {
    config = fn;
    fn = null;
  }
  fn = fn || function(cb) { cb(); };

  var testClass = { testMethod: fn };
  config = extend({ shared: true }, config);
  extend(testClass.testMethod, config);
  return SharedMethod.fromFunction(fn, 'testStaticMethodName');
}
