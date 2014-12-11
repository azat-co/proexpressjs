var test = require('testling');

test('object key order', function (t) {
    var object = {}
    object['a'] = 1
    object['b'] = 2
    object['c'] = 3
    t.deepEqual(object, {a: 1, b: 2, c: 3});
    t.end();
});

/*
  testling result:
  iexplore/8.0:
    object key order .................................. 1/1

  firefox/8.0:
    object key order .................................. 1/1

  opera/10.0:
    object key order .................................. 1/1

  safari/5.1:
    object key order .................................. 1/1

  total ............................................... 4/4

*/