var path = require('path');
var fs = require('fs-extra');
var extend = require('util')._extend;
var sandbox = require('./sandbox');

var appdir = exports;

var PATH = appdir.PATH = null;

appdir.init = function(cb) {
  // Node's module loader has a very aggressive caching, therefore
  // we can't reuse the same path for multiple tests
  // The code here is used to generate a random string
  require('crypto').randomBytes(5, function(err, buf) {
    if (err) return cb(err);
    var randomStr = buf.toString('hex');
    PATH = appdir.PATH = sandbox.resolve(randomStr);
    cb(null, appdir.PATH);
  });
};

appdir.createConfigFilesSync = function(appConfig, dataSources, models) {
  appConfig = extend({
  }, appConfig);
  appdir.writeConfigFileSync ('config.json', appConfig);

  dataSources = extend({
    db: {
      connector: 'memory',
      defaultForType: 'db'
    }
  }, dataSources);
  appdir.writeConfigFileSync ('datasources.json', dataSources);

  models = extend({
  }, models);
  appdir.writeConfigFileSync ('model-config.json', models);
};

appdir.writeConfigFileSync = function(name, json) {
  return appdir.writeFileSync(name, JSON.stringify(json, null, 2));
};

appdir.writeFileSync = function(name, content) {
  var filePath = path.resolve(PATH, name);
  fs.mkdirsSync(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
};
