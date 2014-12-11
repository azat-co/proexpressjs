
//var testObject = {a: 1, b: 'def', c: {d: 1, e: 2, f: {g: 1, h: 'abc'}}}
var jsStringify = require('./index')

var timeFunction = function(fun) {
  var before = new Date().getTime();
  fun()
  var after = new Date().getTime();
  return after - before
}

var count = 100000
var objects

var createObjects = function() {
  objects = []
  for (var i=0; i<count; i++) {
    objects.push({a: Math.random(), b: 'def', c: {d: Math.random(), e: Math.random(), f: {g: Math.random(), h: 'abc'}}})
  }
}

var stringifyLotsOfTimes = function(stringify, objects) { return function() {
  for (var i=0; i<count; i++) {
    var result = stringify(objects[i])
  }
}}

var time0 = timeFunction(createObjects)
console.log('create objects:', time0)

var time1 = timeFunction(stringifyLotsOfTimes(JSON.stringify, objects))
console.log('native JSON.stringify:', time1)

var time2 = timeFunction(stringifyLotsOfTimes(jsStringify, objects))
console.log('js JSON.stringify:', time2)