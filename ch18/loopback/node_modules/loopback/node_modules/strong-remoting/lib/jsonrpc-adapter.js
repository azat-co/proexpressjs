/*!
 * Expose `JsonRpcAdapter`.
 */

module.exports = JsonRpcAdapter;

/*!
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , debug = require('debug')('strong-remoting:jsonrpc-adapter')
  , util = require('util')
  , inherits = util.inherits
  , jayson = require('jayson')
  , express = require('express')
  , bodyParser = require('body-parser')
  , cors = require('cors')
  , HttpContext = require('./http-context');

var json = bodyParser.json;
var urlencoded = bodyParser.urlencoded;

/**
 * Create a new `JsonRpcAdapter` with the given `options`.
 *
 * @param {Object} options
 * @return {JsonRpcAdapter}
 */

function JsonRpcAdapter(remotes) {
  EventEmitter.call(this);

  this.remotes = remotes;
  this.Context = HttpContext;
}

/**
 * Inherit from `EventEmitter`.
 */

inherits(JsonRpcAdapter, EventEmitter);

/*!
 * Simplified APIs
 */

JsonRpcAdapter.create =
  JsonRpcAdapter.createJsonRpcAdapter = function (remotes) {
    // add simplified construction / sugar here
    return new JsonRpcAdapter(remotes);
  };

/**
 * Get the path for the given method.
 */

JsonRpcAdapter.prototype.getRoutes = function (obj) {
  // build default route
  var routes = [
    {
      verb: 'POST',
      path: obj.name ? ('/' + obj.name) : ''
    }
  ];
  return routes;
};

JsonRpcAdapter.errorHandler = function() {
  return function restErrorHandler(err, req, res, next) {
    if(typeof err === 'string') {
      err = new Error(err);
      err.status = err.statusCode = 500;
    }

    res.statusCode = err.statusCode || err.status || 500;

    debug('Error in %s %s: %s', req.method, req.url, err.stack);
    var data = {
      name: err.name,
      status: res.statusCode,
      message: err.message || 'An unknown error occurred'
    };

    for (var prop in err)
      data[prop] = err[prop];

    // TODO(bajtos) Remove stack info when running in production
    data.stack = err.stack;

    res.send({jsonrpc: "2.0", error: {code: -32000, message: "Server error", data: data},
      "id": null});
  };
};

JsonRpcAdapter.prototype.createHandler = function () {

  var root = express.Router();
  var classes = this.remotes.classes();

  // Add a handler to tolerate empty json as connect's json middleware throws an error
  root.use(function (req, res, next) {
    if (req.is('application/json')) {
      if (req.get('Content-Length') === '0') { // This doesn't cover the transfer-encoding: chunked
        req._body = true; // Mark it as parsed
        req.body = {};
      }
    }
    next();
  });

  // Set strict to be `false` so that anything `JSON.parse()` accepts will be parsed
  debug("remoting options: %j", this.remotes.options);
  var urlencodedOptions = this.remotes.options.urlencoded || {extended: true};
  if (urlencodedOptions.extended === undefined) {
    urlencodedOptions.extended = true;
  }
  var jsonOptions = this.remotes.options.json || {strict: false};
  var corsOptions = this.remotes.options.cors || {origin: true, credentials: true};
  root.use(urlencoded(urlencodedOptions));
  root.use(json(jsonOptions));
  root.use(cors(corsOptions));

  root.use(JsonRpcAdapter.errorHandler());

  classes.forEach(function (sc) {
    var server = new jayson.server();
    root.post('/' + sc.name + '/jsonrpc', new jayson.server.interfaces.middleware(server, {}));

    var methods = sc.methods();

    methods.forEach(function (method) {
      // Wrap the method so that it will keep its own receiver - the shared class
      var fn = function () {
        var args = arguments;
        if (method.isStatic) {
          method.fn.apply(method.ctor, args);
        } else {
          method.sharedCtor.invoke(method, function (err, instance) {
            method.fn.apply(instance, args);
          });
        }
      };
      server.method(method.name, fn);
    });

  });

  return root;
};


JsonRpcAdapter.prototype.allRoutes = function () {
  var routes = [];
  var adapter = this;
  var classes = this.remotes.classes();
  var currentRoot = '';

  classes.forEach(function (sc) {


    adapter
      .getRoutes(sc)
      .forEach(function (classRoute) {
        currentRoot = classRoute.path;
        var methods = sc.methods();

        var functions = [];
        methods.forEach(function (method) {
          // Use functions to keep track of JS functions to dedupe
          if (functions.indexOf(method.fn) === -1) {
            functions.push(method.fn);
          } else {
            return; // Skip duplicate methods such as X.m1 = X.m2 = function() {...}
          }
          adapter.getRoutes(method).forEach(function (route) {
            if (method.isStatic) {
              addRoute(route.verb, route.path, method);
            } else {
              adapter
                .getRoutes(method.sharedCtor)
                .forEach(function (sharedCtorRoute) {
                  addRoute(route.verb, sharedCtorRoute.path + route.path, method);
                });
            }
          });
        });
      });
  });

  return routes;


  function addRoute(verb, path, method) {
    if (path === '/' || path === '//') {
      path = currentRoot;
    } else {
      path = currentRoot + path;
    }

    if (path[path.length - 1] === '/') {
      path = path.substr(0, path.length - 1);
    }

    // TODO this could be cleaner
    path = path.replace(/\/\//g, '/');

    routes.push({
      verb: verb,
      path: path,
      description: method.description,
      method: method.stringName,
      accepts: (method.accepts && method.accepts.length) ? method.accepts : undefined,
      returns: (method.returns && method.returns.length) ? method.returns : undefined
    });
  }
};

