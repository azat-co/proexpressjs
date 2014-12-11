#Canonical JSON

The goal of this module is to implement a version of JSON.stringify that returns a canonical JSON format.

Canonical JSON means that the same object should always be stringified to the exact same string.  
JavaScripts native JSON.stringify does not guarantee any order for object keys when serializing:

> Properties of non-array objects are not guaranteed to be stringified in any particular order. Do not rely on ordering of properties within the same object within the stringification.

Source: [https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/JSON/stringify](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/JSON/stringify)

This module implements two alternative solutions to this problem:

- [index.js](https://github.com/mirkok/canonical-json/blob/master/index.js) is based on [Douglas Crockford's json2.js](https://github.com/douglascrockford/JSON-js/blob/master/json2.js). I modified it to serialize object keys sorted on the fly.
- [index2.js](https://github.com/mirkok/canonical-json/blob/master/index2.js) recursively creates a copy of the object to sort its keys. The copy is then simply passed to native JSON.stringify

It currently exports the index.js version.

##Performance comparison
I compared the performance of native JSON.stringify and the two alternative implementations that output keys sorted:

- native JSON.stringify: `75 ms`
- js JSON.stringify with sorted keys ([implementation](https://github.com/mirkok/canonical-json/blob/master/index.js)): `308 ms`
- copy and native JSON.stringify with sorted keys ([implementation](https://github.com/mirkok/canonical-json/blob/master/index2.js): `291 ms`

The tests were run in Node.js on a 2011 MacBook Pro.  
Performance test source: [test/performance.js](https://github.com/mirkok/canonical-json/blob/master/test/performance.js)
