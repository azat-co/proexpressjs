/**
 * Expose `Dynamic`.
 */

module.exports = Dynamic;

/**
 * Module dependencies.
 */

var debug = require('debug')('strong-remoting:dynamic')
  , assert = require('assert');

/**
 * Create a dynamic value from the given value.
 *
 * @param {*} val The value object
 * @param {Context} ctx The Remote Context
 */

function Dynamic(val, ctx) {
  this.val = val;
  this.ctx = ctx;
}

/*!
 * Object containing converter functions.
 */

Dynamic.converters = [];

/**
 * Define a named type conversion. The conversion is used when a
 * `SharedMethod` argument defines a type with the given `name`.
 *
 * ```js
 * Dynamic.define('MyType', function(val, ctx) {
 *   // use the val and ctx objects to return the concrete value
 *   return new MyType(val); 
 * });
 * ```
 *
 * @param {String} name The type name
 * @param {Function} converter
 */

Dynamic.define = function(name, converter) {
  converter.typeName = name;
  this.converters.unshift(converter);
}

/**
 * Is the given type supported.
 * 
 * @param {String} type
 * @returns {Boolean}
 */

Dynamic.canConvert = function(type) {
  return !!this.getConverter(type);
}

/**
 * Get converter by type name.
 * 
 * @param {String} type
 * @returns {Function}
 */

Dynamic.getConverter = function(type) {
  var converters = this.converters;
  var converter;
  for(var i = 0; i < converters.length; i++) {
    converter = converters[i];
    if(converter.typeName === type) {
      return converter;
    }
  }
}

/**
 * Convert the dynamic value to the given type.
 * 
 * @param {String} type
 * @returns {*} The concrete value
 */

Dynamic.prototype.to = function(type) {
  var converter = this.constructor.getConverter(type);
  assert(converter, 'No Type converter defined for ' + type);
  return converter(this.val, this.ctx);
}

/**
 * Built in type converters...
 */

Dynamic.define('boolean', function convertBoolean(val) {
  switch(typeof val) {
    case 'string':
      switch(val) {
        case 'false':
        case 'undefined':
        case 'null':
        case '0':
        case '':
          return false;
        break;
        default:
          return true;
        break;
      }
    break;
    case 'number':
      return val !== 0;
    break;
    default:
      return Boolean(val);
    break;
  }
});

Dynamic.define('number', function convertNumber(val) {
  if(val === 0) return val;
  if(!val) return val;
  return Number(val);
});
