/*!
 * Expose `HttpInvocation`.
 */

module.exports = HttpInvocation;

/*!
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , debug = require('debug')('strong-remoting:http-invocation')
  , util = require('util')
  , inherits = util.inherits
  , path = require('path')
  , assert = require('assert')
  , request = require('request')
  , Dynamic = require('./dynamic')
  , SUPPORTED_TYPES = ['json', 'application/javascript', 'text/javascript']
  , qs = require('qs');

/**
 * Create a new `HttpInvocation`.
 * @class
 * @param {SharedMethod} method
 * @param {Array} [args]
 * @param {String} base The base URL
 * @property {String} base The base URL
 * @property {SharedMethod} method The `SharedMethod` which will be invoked
 * @property {Array} args The arguments to be used when invoking the `SharedMethod`
 */

function HttpInvocation(method, args, base) {
  this.base = base;
  this.method = method;
  this.args = args || [];
  var namedArgs = this.namedArgs = {};
  var val;
  var type;
  
  method.accepts.forEach(function(accept) {
    val = args.shift();
    if(HttpInvocation.isAcceptable(val, accept)) {
      namedArgs[accept.arg || accept.name] = val;
    }
  });
}

/**
 * Inherit from `EventEmitter`.
 */

inherits(HttpInvocation, EventEmitter);

/**
 * Determine if the value matches the given accept definition.
 */

HttpInvocation.isAcceptable = function(val, accept) {
  var acceptArray = Array.isArray(accept.type) || accept.type.toLowerCase() === 'array';
  var type = acceptArray ? 'array' : accept.type && accept.type.toLowerCase();

  var strict = type && type !== 'any';
  
  if(acceptArray) {
    return Array.isArray(val);
  }

  if(strict) {
    return (typeof val).toLowerCase() === type; 
  } else {
    return true;
  }
}

/**
 * Build args object from the http context's `req` and `res`.
 */

HttpInvocation.prototype.createRequest = function () {
  var args = {};
  var method = this.method;
  var verb = method.getHttpMethod();
  var req = {json: true, method: verb || 'GET'};
  var accepts = method.accepts;
  var returns = method.returns;
  var query;

  // initial url is the format
  req.url = this.base + method.getFullPath();

  // build request args and method options
  accepts.forEach(function (accept) {
    var httpFormat = accept.http;
    var name = accept.name || accept.arg;
    var val = this.getArgByName(name);

    if(httpFormat) {
      switch(typeof httpFormat) {
        case 'function':
          // ignore defined formatter
        break;
        case 'object':
          switch(httpFormat.source) {
            case 'body':
              req.body = val;
            break;
            case 'form':
              // From the form (body)
              req.body = req.body || {};
              req.body[name] = val;
              break;
            case 'query':
              // From the query string
              if(val !== undefined) {
                query = query || {};
                query[name] = val;
              }
              break;
            case 'path':
              // From the url path
              req.url = req.url.replace(':' + name, val);
            break;
          }
        break;
      }
    } else if(verb.toLowerCase() === 'get') {      
      // default to query string for GET
      if(val !== undefined) {
        query = query || {};
        query[name] = val;
      }
    } else {
      // default to storing args on the body for !GET
      req.body = req.body || {};
      req.body[name] = val;
    }
  }.bind(this));

  if(query) {
    req.url += '?' + qs.stringify(query);
  }

  return req;
}

/**
 * Get an arg value by name using the given options.
 *
 * @param {String} name
 */

HttpInvocation.prototype.getArgByName = function (name) {
  return this.namedArgs[name];
}

/**
 * Start the invocation.
 */

HttpInvocation.prototype.invoke = function (callback) {
  var req = this.createRequest();
  request(req, function(err, res, body) {
    if(err instanceof SyntaxError) {
      if(res.status === 204) err = null;
    }
    if(err) return callback(err);
    this.transformResponse(res, body, callback);
  }.bind(this));
}

/**
 * Transform the response into callback arguments
 * @param {HttpResponse} res
 * @param {Function} callback
 */

HttpInvocation.prototype.transformResponse = function(res, body, callback) {
  var callbackArgs = [null]; // null => placeholder for err
  var method = this.method;
  var returns = method.returns;
  var isObject = typeof body === 'object';
  var err;
  var hasError = res.statusCode >= 400;
  var errMsg;
  var ctx = {
    method: method,
    req: res.req,
    res: res
  };

  if(hasError) {
    if(isObject && body.error) {
      err = new Error(body.error.message);
      err.name = body.error.name;
      err.stack = body.error.stack;
      err.details = body.error.details;
    } else {
      err = new Error('Error: ' + res.statusCode);
    }

    return callback(err);
  }

  // build request args and method options
  returns.forEach(function (ret) {
    var httpFormat = ret.http;
    var name = ret.name || ret.arg;
    var val;
    var dynamic;
    var type = ret.type;

    if(ret.root) {
      val = res.body;
    } else {
      val = res.body[name];
    }

    if(Dynamic.canConvert(type)) {
      dynamic = new Dynamic(val, ctx);
      val = dynamic.to(type);
    }

    callbackArgs.push(val);
  }.bind(this));

  callback.apply(this, callbackArgs);
}
