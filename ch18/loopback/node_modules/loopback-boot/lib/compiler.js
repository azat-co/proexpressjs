var assert = require('assert');
var cloneDeep = require('lodash.clonedeep');
var fs = require('fs');
var path = require('path');
var toposort = require('toposort');
var ConfigLoader = require('./config-loader');
var debug = require('debug')('loopback:boot:compiler');

/**
 * Gather all bootstrap-related configuration data and compile it into
 * a single object containing instruction for `boot.execute`.
 *
 * @options {String|Object} options Boot options; If String, this is
 * the application root directory; if object, has the properties
 * described in `bootLoopBackApp` options above.
 * @return {Object}
 *
 * @header boot.compile(options)
 */

module.exports = function compile(options) {
  options = options || {};

  if(typeof options === 'string') {
    options = { appRootDir: options };
  }

  var appRootDir = options.appRootDir = options.appRootDir || process.cwd();
  var env = options.env || process.env.NODE_ENV || 'development';

  var appConfig = options.config || ConfigLoader.loadAppConfig(appRootDir, env);
  assertIsValidConfig('app', appConfig);

  var modelsRootDir = options.modelsRootDir || appRootDir;
  var modelsConfig = options.models ||
    ConfigLoader.loadModels(modelsRootDir, env);
  assertIsValidModelConfig(modelsConfig);

  var dsRootDir = options.dsRootDir || appRootDir;
  var dataSourcesConfig = options.dataSources ||
    ConfigLoader.loadDataSources(dsRootDir, env);
  assertIsValidConfig('data source', dataSourcesConfig);

  // require directories
  var bootScripts = findScripts(path.join(appRootDir, 'boot'));

  var modelsMeta = modelsConfig._meta || {};
  delete modelsConfig._meta;

  var modelSources = modelsMeta.sources || ['./models'];
  var modelInstructions = buildAllModelInstructions(
    modelsRootDir, modelsConfig, modelSources);

  // When executor passes the instruction to loopback methods,
  // loopback modifies the data. Since we are loading the data using `require`,
  // such change affects also code that calls `require` for the same file.
  return cloneDeep({
    config: appConfig,
    dataSources: dataSourcesConfig,
    models: modelInstructions,
    files: {
      boot: bootScripts
    }
  });
};

function assertIsValidConfig(name, config) {
  if(config) {
    assert(typeof config === 'object',
        name + ' config must be a valid JSON object');
  }
}

function assertIsValidModelConfig(config) {
  assertIsValidConfig('model', config);
  for (var name in config) {
    var entry = config[name];
    var options = entry.options || {};
    var unsupported = entry.properties ||
      entry.base || options.base ||
      entry.plural || options.plural;

    if (unsupported) {
      throw new Error(
        'The data in model-config.json is in the unsupported 1.x format.');
    }
  }
}

/**
 * Find all javascript files (except for those prefixed with _)
 * and all directories.
 * @param {String} dir Full path of the directory to enumerate.
 * @return {Array.<String>} A list of absolute paths to pass to `require()`.
 * @private
 */

function findScripts(dir) {
  assert(dir, 'cannot require directory contents without directory name');

  var files = tryReadDir(dir);

  // sort files in lowercase alpha for linux
  files.sort(function(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();

    if (a < b) {
      return -1;
    } else if (b < a) {
      return 1;
    } else {
      return 0;
    }
  });

  var results = [];
  files.forEach(function(filename) {
    // ignore index.js and files prefixed with underscore
    if ((filename === 'index.js') || (filename[0] === '_')) {
      return;
    }

    var filepath = path.resolve(path.join(dir, filename));
    var ext = path.extname(filename);
    var stats = fs.statSync(filepath);

    // only require files supported by require.extensions (.txt .md etc.)
    if (stats.isFile()) {
      if (ext in require.extensions)
        results.push(filepath);
      else
        debug('Skipping file %s - unknown extension', filepath);
    } else {
      try {
        path.join(require.resolve(filepath));
      } catch(err) {
        debug('Skipping directory %s - %s', filepath, err.code || err);
      }
    }
  });

  return results;
}

function tryReadDir() {
  try {
    return fs.readdirSync.apply(fs, arguments);
  } catch(e) {
    return [];
  }
}

function buildAllModelInstructions(rootDir, modelsConfig, sources) {
  var registry = findModelDefinitions(rootDir, sources);

  var modelNamesToBuild = addAllBaseModels(registry, Object.keys(modelsConfig));

  var instructions = modelNamesToBuild
    .map(function createModelInstructions(name) {
      var config = modelsConfig[name];
      var definition = registry[name] || {};

      debug('Using model "%s"\nConfiguration: %j\nDefinition %j',
        name, config, definition.definition);

      return {
        name: name,
        config: config,
        definition: definition.definition,
        sourceFile: definition.sourceFile
      };
    });

  return sortByInheritance(instructions);
}

function addAllBaseModels(registry, modelNames) {
  var result = [];
  var visited = {};

  while (modelNames.length) {
    var name = modelNames.shift();

    if (visited[name]) continue;
    visited[name] = true;
    result.push(name);

    var definition = registry[name] && registry[name].definition;
    if (!definition) continue;

    var base = getBaseModelName(definition);

    // ignore built-in models like User
    if (!registry[base]) continue;

    modelNames.push(base);
  }

  return result;
}

function getBaseModelName(modelDefinition) {
  if (!modelDefinition)
    return undefined;

  return modelDefinition.base ||
    modelDefinition.options && modelDefinition.options.base;
}

function sortByInheritance(instructions) {
  // create edges Base name -> Model name
  var edges = instructions
    .map(function(inst) {
      return [getBaseModelName(inst.definition), inst.name];
    });

  var sortedNames = toposort(edges);

  var instructionsByModelName = {};
  instructions.forEach(function(inst) {
    instructionsByModelName[inst.name] = inst;
  });

  return sortedNames
    // convert to instructions
    .map(function(name) {
      return instructionsByModelName[name];
    })
    // remove built-in models
    .filter(function(inst) {
      return !!inst;
    });
}

function findModelDefinitions(rootDir, sources) {
  var registry = {};

  sources.forEach(function(src) {
    var srcDir = path.resolve(rootDir, src);
    var files = tryReadDir(srcDir);
    files
      .filter(function(f) {
        return f[0] !== '_' && path.extname(f) === '.json';
      })
      .forEach(function(f) {
        var fullPath = path.resolve(srcDir, f);
        var entry = loadModelDefinition(rootDir, fullPath);
        var modelName = entry.definition.name;
        if (!modelName) {
          debug('Skipping model definition without Model name: %s',
            path.relative(srcDir, fullPath));
          return;
        }
        registry[modelName] = entry;
      });
  });

  return registry;
}

function loadModelDefinition(rootDir, jsonFile) {
  var definition = require(jsonFile);

  var sourceFile = path.join(
    path.dirname(jsonFile),
    path.basename(jsonFile, path.extname(jsonFile)));

  try {
    // resolve the file to `.js` or any other supported extension like `.coffee`
    sourceFile = require.resolve(sourceFile);
  } catch (err) {
    debug('Model source code not found: %s - %s', sourceFile, err.code || err);
    sourceFile = undefined;
  }

  if (sourceFile === jsonFile)
    sourceFile = undefined;

  debug('Found model "%s" - %s %s', definition.name,
    path.relative(rootDir, jsonFile),
    sourceFile ? path.relative(rootDir, sourceFile) : '(no source file)');

  return {
    definition: definition,
    sourceFile: sourceFile
  };
}
