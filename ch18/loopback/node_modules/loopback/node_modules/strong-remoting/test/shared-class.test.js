var extend = require('util')._extend;
var expect = require('chai').expect;
var SharedClass = require('../lib/shared-class');
var factory = require('./helpers/shared-objects-factory.js');
var RemoteObjects = require('../');

describe('SharedClass', function() {
  var SomeClass;
  beforeEach(function() { SomeClass = factory.createSharedClass(); });

  describe('constructor', function() {
    it('fills http.path from ctor.http', function() {
      SomeClass.http = { path: '/foo' };
      var sc = new SharedClass('some', SomeClass);
      expect(sc.http.path).to.equal('/foo');
    });

    it('fills http.path using the name', function() {
      var sc = new SharedClass('some', SomeClass);
      expect(sc.http.path).to.equal('/some');
    });

    it('does not require a sharedConstructor', function() {
      var myClass = {};
      myClass.remoteNamespace = 'bar';
      myClass.foo = function() {};
      myClass.foo.shared = true;

      var sc = new SharedClass(undefined, myClass);
      var fns = sc.methods().map(function(m) {return m.name});
      expect(fns).to.contain('foo');
      expect(sc.http).to.eql({ path: '/bar' });
    });
  });

  describe('sharedClass.methods()', function() {
    it('discovers remote methods', function() {
      var sc = new SharedClass('some', SomeClass);
      SomeClass.staticMethod = function() {};
      SomeClass.staticMethod.shared = true;
      SomeClass.prototype.instanceMethod = function() {};
      SomeClass.prototype.instanceMethod.shared = true;
      var fns = sc.methods().map(function(m) {return m.fn});
      expect(fns).to.contain(SomeClass.staticMethod);
      expect(fns).to.contain(SomeClass.prototype.instanceMethod);
    });
    it('only discovers a function once with aliases', function() {
      function MyClass() {};
      var sc = new SharedClass('some', MyClass);
      var fn = function() {};
      fn.shared = true;
      MyClass.a = fn;
      MyClass.b = fn;
      MyClass.prototype.a = fn;
      MyClass.prototype.b = fn;
      var methods = sc.methods();
      var fns = methods.map(function(m) {return m.fn});
      expect(fns.length).to.equal(1);
      expect(methods[0].aliases.sort()).to.eql(['a', 'b']);
    });
    it('discovers multiple functions correctly', function() {
      function MyClass() {};
      var sc = new SharedClass('some', MyClass);
      MyClass.a = createSharedFn();
      MyClass.b = createSharedFn();
      MyClass.prototype.a = createSharedFn();
      MyClass.prototype.b = createSharedFn();
      var fns = sc.methods().map(function(m) {return m.fn});
      expect(fns.length).to.equal(4);
      expect(fns).to.contain(MyClass.a);
      expect(fns).to.contain(MyClass.b);
      expect(fns).to.contain(MyClass.prototype.a);
      expect(fns).to.contain(MyClass.prototype.b);
      function createSharedFn() {
        var fn = function() {};
        fn.shared = true;
        return fn;
      }
    });
    it('should skip properties that are model classes', function() {
      var sc = new SharedClass('some', SomeClass);
      function MockModel1() {};
      MockModel1.modelName = 'M1';
      MockModel1.shared = true;
      SomeClass.staticMethod = MockModel1;

      function MockModel2() {};
      MockModel2.modelName = 'M2';
      MockModel2.shared = true;
      SomeClass.prototype.instanceMethod = MockModel2;
      var fns = sc.methods().map(function(m) {return m.fn});
      expect(fns).to.not.contain(SomeClass.staticMethod);
      expect(fns).to.not.contain(SomeClass.prototype.instanceMethod);
    });
  });

  describe('sharedClass.defineMethod(name, options)', function() {
    it('defines a remote method', function () {
      var sc = new SharedClass('SomeClass', SomeClass);
      SomeClass.prototype.myMethod = function() {};
      var METHOD_NAME = 'myMethod';
      sc.defineMethod(METHOD_NAME, {
        prototype: true
      });
      var methods = sc.methods().map(function(m) {return m.name});
      expect(methods).to.contain(METHOD_NAME);
    });
    it('should allow a shared class to resolve dynamically defined functions',
      function (done) {
        var MyClass = function() {};
        var METHOD_NAME = 'dynFn';
        process.nextTick(function() {
          MyClass[METHOD_NAME] = function(str, cb) {
            cb(null,  str);
          }
          done();
        });

        var sharedClass = new SharedClass('MyClass', MyClass);

        sharedClass.defineMethod(METHOD_NAME, {});
        var methods = sharedClass.methods().map(function(m) {return m.name});
        expect(methods).to.contain(METHOD_NAME);
      }
    );
  });

  describe('sharedClass.resolve(resolver)', function () {
    it('should allow sharedMethods to be resolved dynamically', function () {
      function MyClass() {};
      MyClass.obj = {
        dyn: function(cb) {
          cb();
        }
      };
      var sharedClass = new SharedClass('MyClass', MyClass);
      sharedClass.resolve(function(define) {
        define('dyn', {}, MyClass.obj.dyn);
      });
      var methods = sharedClass.methods().map(function(m) {return m.name});
      expect(methods).to.contain('dyn');
    });
  });

  describe('sharedClass.find()', function () {
    var sc;
    var sm;
    beforeEach(function() {
      sc = new SharedClass('SomeClass', SomeClass);
      SomeClass.prototype.myMethod = function() {};
      var METHOD_NAME = 'myMethod';
      sm = sc.defineMethod(METHOD_NAME, {
        prototype: true
      });
    });
    it('finds sharedMethod for the given function', function () {
      assert(sc.find(SomeClass.prototype.myMethod) === sm);
    });
    it('find sharedMethod by name', function () {
      assert(sc.find('myMethod') === sm);
    });
  });


  describe('remotes.addClass(sharedClass)', function() {
    it('should make the class available', function () {
      var CLASS_NAME = 'SomeClass';
      var remotes = RemoteObjects.create();
      var sharedClass = new SharedClass(CLASS_NAME, SomeClass);
      remotes.addClass(sharedClass);
      var classes = remotes.classes().map(function(c) {return c.name});
      expect(classes).to.contain(CLASS_NAME);
    });
  });
});
