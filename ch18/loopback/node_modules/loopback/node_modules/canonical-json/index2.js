
var isObject = function(a) {
  return Object.prototype.toString.call(a) === '[object Object]'
}

var isArray = function(a) {
  return Object.prototype.toString.call(a) === '[object Array]'
}

var copyObjectWithSortedKeys = function(object) {
  if (isObject(object)) {
    var newObj = {}
    var keysSorted = Object.keys(object).sort()
    var key
    for (var i in keysSorted) {
      key = keysSorted[i]
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        newObj[key] = copyObjectWithSortedKeys(object[key])
      }
    }
    return newObj
  } else if (isArray(object)) {
    return object.map(copyObjectWithSortedKeys)
  } else {
    return object
  }
}

module.exports = function(object) {
  return JSON.stringify(copyObjectWithSortedKeys(object))
}
