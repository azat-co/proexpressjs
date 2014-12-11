var Dynamic = require('../lib/dynamic');
var RemoteObjects = require('../');

describe('types', function () {
  var remotes;
  beforeEach(function() {
    remotes = RemoteObjects.create();
  });
  describe('remotes.defineType(name, fn)', function () {
    it('should define a new type converter', function () {
      var name = 'MyType';
      remotes.defineType(name, function(val, ctx) {
        return val;
      });
      assert(Dynamic.getConverter(name));
    });
  });

  describe('Dynamic(val, [ctx])', function () {
    describe('Dynamic.to(typeName)', function () {
      it('should convert the dynamic to the given type', function () {
        Dynamic.define('beep', function(str) {
          return 'boop';
        });
        var dyn = new Dynamic('beep');
        assert.equal(dyn.to('beep'), 'boop');        
      });
    });
    describe('Dynamic.canConvert(typeName)', function () {
      it('should only return true when a converter exists', function () {
        Dynamic.define('MyType', function() {});
        assert(Dynamic.canConvert('MyType'));
        assert(!Dynamic.canConvert('FauxType'));
      });
    });
    describe('Built in converters', function(){
      it('should convert Boolean values', function() {
        shouldConvert(true, true);
        shouldConvert(false, false);
        shouldConvert(256, true);
        shouldConvert(-1, true);
        shouldConvert(1, true);
        shouldConvert(0, false);
        shouldConvert('true', true);
        shouldConvert('false', false);
        shouldConvert('0', false);
        shouldConvert('1', true);
        shouldConvert('-1', true);
        shouldConvert('256', true);
        shouldConvert('null', false);
        shouldConvert('undefined', false);
        shouldConvert('', false);
        
        function shouldConvert(val, expected) {
          var dyn = new Dynamic(val);
          assert.equal(dyn.to('boolean'), expected);
        }
      });
      it('should convert Number values', function() {
        shouldConvert('-1', -1);
        shouldConvert('0', 0);
        shouldConvert('1', 1);
        shouldConvert('0.1', 0.1);
        shouldConvert(1, 1);
        shouldConvert(true, 1);
        shouldConvert(false, 0);
        shouldConvert({}, 'NaN');
        shouldConvert([], 0);
        
        function shouldConvert(val, expected) {
          var dyn = new Dynamic(val);
          
          if(expected === 'NaN') {
            return assert(Number.isNaN(dyn.to('number')));
          }
          
          assert.equal(dyn.to('number'), expected);
        }
      });
    });
  });
});
