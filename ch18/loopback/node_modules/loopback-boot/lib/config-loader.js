var fs = require('fs');
var path = require('path');

var ConfigLoader = exports;

/**
 * Load application config from `app.json` and friends.
 * @param {String} rootDir Directory where to look for files.
 * @param {String} env Environment, usually `process.env.NODE_ENV`
 * @returns {Object}
 */
ConfigLoader.loadAppConfig = function(rootDir, env) {
  return loadNamed(rootDir, env, 'config', mergeAppConfig);
};

/**
 * Load data-sources config from `datasources.json` and friends.
 * @param {String} rootDir Directory where to look for files.
 * @param {String} env Environment, usually `process.env.NODE_ENV`
 * @returns {Object}
 */
ConfigLoader.loadDataSources = function(rootDir, env) {
  return loadNamed(rootDir, env, 'datasources', mergeDataSourceConfig);
};

/**
 * Load model config from `model-config.json` and friends.
 * @param {String} rootDir Directory where to look for files.
 * @param {String} env Environment, usually `process.env.NODE_ENV`
 * @returns {Object}
 */
ConfigLoader.loadModels = function(rootDir, env) {
  /*jshint unused:false */
  return tryReadJsonConfig(rootDir, 'model-config') || {};
};

/*-- Implementation --*/

/**
 * Load named configuration.
 * @param {String} rootDir Directory where to look for files.
 * @param {String} env Environment, usually `process.env.NODE_ENV`
 * @param {String} name
 * @param {function(target:Object, config:Object, filename:String)} mergeFn
 * @returns {Object}
 */
function loadNamed(rootDir, env, name, mergeFn) {
  var files = findConfigFiles(rootDir, env, name);
  var configs = loadConfigFiles(files);
  return mergeConfigurations(configs, mergeFn);
}

/**
 * Search `appRootDir` for all files containing configuration for `name`.
 * @param {String} appRootDir
 * @param {String} env Environment, usually `process.env.NODE_ENV`
 * @param {String} name
 * @returns {Array.<String>} Array of absolute file paths.
 */
function findConfigFiles(appRootDir, env, name) {
  var master = ifExists(name + '.json');
  if (!master) return [];

  var candidates = [
    master,
    ifExistsWithAnyExt(name + '.local'),
    ifExistsWithAnyExt(name + '.' + env)
  ];

  return candidates.filter(function(c) { return c !== undefined; });

  function ifExists(fileName) {
    var filepath = path.resolve(appRootDir, fileName);
    return fs.existsSync(filepath) ? filepath : undefined;
  }

  function ifExistsWithAnyExt(fileName) {
    return ifExists(fileName + '.js') || ifExists(fileName + '.json');
  }
}

/**
 * Load configuration files into an array of objects.
 * Attach non-enumerable `_filename` property to each object.
 * @param {Array.<String>} files
 * @returns {Array.<Object>}
 */
function loadConfigFiles(files) {
  return files.map(function(f) {
    var config = require(f);
    Object.defineProperty(config, '_filename', {
      enumerable: false,
      value: f
    });
    return config;
  });
}

/**
 * Merge multiple configuration objects into a single one.
 * @param {Array.<Object>} configObjects
 * @param {function(target:Object, config:Object, filename:String)} mergeFn
 */
function mergeConfigurations(configObjects, mergeFn) {
  var result = configObjects.shift() || {};
  while(configObjects.length) {
    var next = configObjects.shift();
    mergeFn(result, next, next._filename);
  }
  return result;
}

function mergeDataSourceConfig(target, config, fileName) {
  for (var ds in target) {
    var err = applyCustomConfig(target[ds], config[ds]);
    if (err) {
      throw new Error('Cannot apply ' + fileName + ' to `'  + ds + '`: ' + err);
    }
  }
}

function mergeAppConfig(target, config, fileName) {
  var err = applyCustomConfig(target, config);
  if (err) {
    throw new Error('Cannot apply ' + fileName + ': ' + err);
  }
}

function applyCustomConfig(target, config) {
  for (var key in config) {
    var value = config[key];
    if (typeof value === 'object') {
      return 'override for the option `' + key + '` is not a value type.';
    }
    target[key] = value;
  }
  return null; // no error
}

/**
 * Try to read a config file with .json extension
 * @param cwd Dirname of the file
 * @param fileName Name of the file without extension
 * @returns {Object|undefined} Content of the file, undefined if not found.
 */
function tryReadJsonConfig(cwd, fileName) {
  try {
    return require(path.join(cwd, fileName + '.json'));
  } catch(e) {
    if(e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
  }
}
