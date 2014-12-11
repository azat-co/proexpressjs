var boot = require('../');
var fs = require('fs');
var path = require('path');
var expect = require('must');
var browserify = require('browserify');
var sandbox = require('./helpers/sandbox');
var vm = require('vm');

describe('browser support', function() {
  it('has API for bundling and executing boot instructions', function(done) {
    var appDir = path.resolve(__dirname, './fixtures/browser-app');

    browserifyTestApp(appDir, function(err, bundlePath) {
      if (err) return done(err);

      var app = executeBundledApp(bundlePath);

      // configured in fixtures/browser-app/boot/configure.js
      expect(app.settings).to.have.property('custom-key', 'custom-value');
      expect(Object.keys(app.models)).to.include('Customer');
      expect(app.models.Customer.settings)
        .to.have.property('_customized', 'Customer');

      done();
    });
  });
});

function browserifyTestApp(appDir, next) {
  var b = browserify({
    basedir: appDir,
  });
  b.require('./app.js', { expose: 'browser-app' });

  boot.compileToBrowserify(appDir, b);

  var bundlePath = sandbox.resolve('browser-app-bundle.js');
  var out = fs.createWriteStream(bundlePath);
  b.bundle({ debug: true }).pipe(out);

  out.on('error', function(err) { return next(err); });
  out.on('close', function() {
    next(null, bundlePath);
  });
}

function executeBundledApp(bundlePath) {
  var code = fs.readFileSync(bundlePath);
  var context = createBrowserLikeContext();
  vm.runInContext(code, context, bundlePath);
  var app = vm.runInContext('require("browser-app")', context);

  printContextLogs(context);

  return app;
}

function createBrowserLikeContext() {
  var context = {
    // required by browserify
    XMLHttpRequest: function() { throw new Error('not implemented'); },

    localStorage: {
      // used by `debug` module
      debug: process.env.DEBUG
    },

    // used by `debug` module
    document: { documentElement: { style: {} } },

    // used by crypto-browserify & friends
    Int32Array: Int32Array,
    DataView: DataView,

    // allow the browserified code to log messages
    // call `printContextLogs(context)` to print the accumulated messages
    console: {
      log: function() {
        this._logs.log.push(Array.prototype.slice.call(arguments));
      },
      warn: function() {
        this._logs.warn.push(Array.prototype.slice.call(arguments));
      },
      error: function() {
        this._logs.error.push(Array.prototype.slice.call(arguments));
      },
      _logs: {
        log: [],
        warn: [],
        error: []
      },
    }
  };

  // `window` is used by loopback to detect browser runtime
  context.window = context;

  return vm.createContext(context);
}

function printContextLogs(context) {
  for (var k in context.console._logs) {
    var items = context.console._logs[k];
    for (var ix in items) {
      console[k].apply(console, items[ix]);
    }
  }
}
