/*!
 * Expose `SharedMethod`.
 */

module.exports = SharedMethod;

/*!
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , debug = require('debug')('strong-remoting:shared-method')
  , util = require('util')
  , inherits = util.inherits
  , assert = require('assert')
  , traverse = require('traverse');

/**
 * Create a new `SharedMethod` with the given `fn`.
 *
 * @class SharedMethod
 * @param {Function} fn The `Function` to be invoked when the method is invoked
 * @param {String} name The name of the `SharedMethod`
 * @param {SharedClass} sharedClass The `SharedClass` the method will be attached to
 * @param {Object|Boolean} options
 * @param {Boolean} [options.isStatic] Is the method a static method or a
 * a `prototype` method
 * @param {Array} [options.aliases] A list of aliases for the
 * `sharedMethod.name`
 * @param {Array|Object} [options.accepts] An `Array` of argument definitions
 * that describe the arguments of the `SharedMethod`.
 * @param {Boolean} [options.shared] Default is `true`
 * @param {String} [options.accepts.arg] The name of the argument
 * @param {String} [options.accepts.http] HTTP mapping for the argument
 * @param {String} [options.accepts.http.source] The HTTP source for the
 * argument. May be one of the following:
 * 
 * - `req` - the Express `Request` object
 * - `req` - the Express `Request` object
 * - `body` - the `req.body` value
 * - `form` - `req.body[argumentName]`
 * - `query` - `req.query[argumentName]`
 * - `path` - `req.params[argumentName]`
 * - `context` - the current `HttpContext`
 * @param {Object} [options.accepts.rest] The REST mapping / settings for the
 * argument.
 * @param {Array|Object} [options.returns] An `Array` of argument definitions
 * The same options are available as `options.accepts`.
 * @property {String} name The method name
 * @property {String[]} aliases An array of method aliases
 * @property {Array|Object} isStatic
 * @property {Array|Object} accepts See `options.accepts`
 * @property {Array|Object} returns See `options.returns`
 * @property {String} description
 * @property {String} http
 * @property {String} rest
 * @property {String} shared
 */

function SharedMethod(fn, name, sc, options) {
  if (typeof options === 'boolean') {
    options = { isStatic: options };
  }
  
  this.fn = fn;
  fn = fn || {};
  this.name = name;
  options = options || {};
  this.aliases = options.aliases || [];
  var isStatic = this.isStatic = options.isStatic || false;
  this.accepts = options.accepts || fn.accepts || [];
  this.returns = options.returns || fn.returns || [];
  this.description = options.description || fn.description;
  this.http = options.http || fn.http || {};
  this.rest = options.rest || fn.rest || {};
  this.shared = options.shared;
  if(this.shared === undefined) {
    this.shared = true;
  }
  if(fn.shared === false) {
    this.shared = false;
  }
  this.sharedClass = sc;

  if(sc) {
    this.ctor = sc.ctor;
    this.sharedCtor = sc.sharedCtor;
  }
  if(name === 'sharedCtor') {
    this.isSharedCtor = true;
  }

  if(this.accepts && !Array.isArray(this.accepts)) {
    this.accepts = [this.accepts];
  }
  if(this.returns && !Array.isArray(this.returns)) {
    this.returns = [this.returns];
  }

  this.stringName = (sc ? sc.name : '') + (isStatic ? '.' : '.prototype.') + name;
}

/**
 * Create a new `SharedMethod` with the given `fn`. The function should include
 * all the method options.
 *
 * @param {Function} fn
 * @param {Function} name
 * @param {SharedClass} SharedClass
 * @param {Boolean} isStatic
 */

SharedMethod.fromFunction = function(fn, name, sharedClass, isStatic) {
  return new SharedMethod(fn, name, sharedClass, {
    isStatic: isStatic,
    accepts: fn.accepts,
    returns: fn.returns,
    description: fn.description,
    http: fn.http,
    rest: fn.rest
  });
}

/**
 * Execute the remote method using the given arg data.
 *
 * @param {Object} args containing named argument data
 * @param {Function} fn callback `fn(err, result)` containing named result data
 */

SharedMethod.prototype.invoke = function (scope, args, fn) {
  var accepts = this.accepts;
  var returns = this.returns;
  var method = this.getFunction();
  var sharedMethod = this;
  var formattedArgs = [];
  var result;

  // map the given arg data in order they are expected in
  if(accepts) {
    for(var i = 0; i < accepts.length; i++) {
      var desc = accepts[i];
      var name = desc.name || desc.arg;
      var uarg = SharedMethod.convertArg(desc, args[name]);
      var actualType = SharedMethod.getType(uarg);

      // is the arg optional?
      // arg was not provided
      if(actualType === 'undefined') {
        if(desc.required) {
          var err = new Error(name + ' is a required arg');
          err.statusCode = 400;
          return fn(err);
        } else {
          // Add the argument even if it's undefined to stick with the accepts
          formattedArgs.push(undefined);
          continue;
        }
      }

      // convert strings
      if(actualType === 'string' && desc.type !== 'any' && actualType !== desc.type) {
        switch(desc.type) {
          case 'number':
            uarg = Number(uarg);
          break;
          case 'boolean':
            uarg = Boolean(uarg);
          break;
          case 'object':
          case 'array':
            try {
              uarg = JSON.parse(uarg);
            } catch(err) {
              debug('- %s - invalid value for argument \'%s\' of type \'%s\': %s',
                sharedMethod.name, name, desc.type, uarg);
              return fn(err);
            }
          break;
        }
      }

      // Add the argument even if it's undefined to stick with the accepts
      formattedArgs.push(uarg);
    }
  }

  // define the callback
  function callback(err) {
    if(err) {
      return fn(err);
    }

    result = SharedMethod.toResult(returns, [].slice.call(arguments, 1));

    debug('- %s - result %j', sharedMethod.name, result);

    fn(null, result);
  }

  // add in the required callback
  formattedArgs.push(callback);

  debug('- %s - invoke with', this.name, formattedArgs);

  // invoke
  return method.apply(scope, formattedArgs);
}

/**
 * Returns an appropriate type based on `val`.
 * @param {*} val The value to determine the type for
 * @returns {String} The type name
 */

SharedMethod.getType = function (val) {
  var type = typeof val;

  switch (type) {
    case 'undefined':
    case 'boolean':
    case 'number':
    case 'function':
    case 'string':
      return type;
    case 'object':
      // null
      if (val === null) {
        return 'null';
      }

      // buffer
      if (Buffer.isBuffer(val)) {
        return 'buffer';
      }

      // array
      if (Array.isArray(val)) {
        return 'array';
      }

      // date
      if (val instanceof Date) {
        return 'date';
      }

      // object
      return 'object';
  }
};

/**
 * Returns a reformatted Object valid for consumption as remoting function
 * arguments
 */

SharedMethod.convertArg = function(accept, raw) {
  if(accept.http && (accept.http.source === 'req'
    || accept.http.source === 'res'
    || accept.http.source === 'context'
    )) {
    return raw;
  }
  if(raw === null || typeof raw !== 'object') {
    return raw;
  }
  var data = traverse(raw).forEach(function(x) {
    if(x === null || typeof x !== 'object') {
      return x;
    }
    var result = x;
    if(x.$type === 'base64' || x.$type === 'date') {
      switch (x.$type) {
        case 'base64':
          result = new Buffer(x.$data, 'base64');
          break;
        case 'date':
          result = new Date(x.$data);
          break;
      }
      this.update(result);
    }
    return result;
  });
  return data;
};

/**
 * Returns a reformatted Object valid for consumption as JSON from an Array of
 * results from a remoting function, based on `returns`.
 */

SharedMethod.toResult = function(returns, raw) {
  var result = {};

  if (!returns.length) {
    return;
  }

  returns = returns.filter(function (item, index) {
    if (index >= raw.length) {
      return false;
    }

    if (item.root) {
      result = convert(raw[index]);
      return false;
    }

    return true;
  });

  returns.forEach(function (item, index) {
    result[item.name || item.arg] = convert(raw[index]);
  });

  return result;

  function convert(val) {
    switch (SharedMethod.getType(val)) {
      case 'date':
        return {
          $type: 'date',
          $data: val.toString()
        };
      case 'buffer':
        return {
          $type: 'base64',
          $data: val.toString('base64')
        };
    }

    return val;
  }
};


/**
 * Get the function the `SharedMethod` will `invoke()`.
 */

SharedMethod.prototype.getFunction = function() {
  var fn;
  
  if(!this.ctor) return this.fn;

  if(this.isStatic) {
    fn = this.ctor[this.name];
  } else {
    fn = this.ctor.prototype[this.name];
  }

  return fn || this.fn;
}

/**
 * Will this shared method invoke the given `suspect`?
 *
 * ```js
 * // examples
 * sharedMethod.isDelegateFor(myClass.myMethod); // pass a function
 * sharedMethod.isDelegateFor(myClass.prototype.myInstMethod);
 * sharedMethod.isDelegateFor('myMethod', true); // check for a static method by name 
 * sharedMethod.isDelegateFor('myInstMethod', false); // instance method by name
 * ```
 *
 * @param {String|Function} suspect The name of the suspected function
 * or a `Function`.
 */

SharedMethod.prototype.isDelegateFor = function(suspect, isStatic) {
  var type = typeof suspect;
  isStatic = isStatic || false;


  if(suspect) {
    switch(type) {
      case 'function':
        return this.getFunction() === suspect;
      break;
      case 'string':
        if(this.isStatic !== isStatic) return false;
        return this.name === suspect || this.aliases.indexOf(suspect) !== -1;
      break;
    }
  }

  return false;
}

/**
 * Add an alias
 * 
 * @param {String} alias
 */

SharedMethod.prototype.addAlias = function(alias) {
  if(this.aliases.indexOf(alias) === -1) {
    this.aliases.push(alias);
  }
}
