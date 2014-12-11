var fs = require('fs');
var path = require('path');
var commondir = require('commondir');

/**
 * Add boot instructions to a browserify bundler.
 * @param {Object} instructions Boot instructions.
 * @param {Object} bundler A browserify object created by `browserify()`.
 */

module.exports = function addInstructionsToBrowserify(instructions, bundler) {
  bundleModelScripts(instructions, bundler);
  bundleOtherScripts(instructions, bundler);
  bundleInstructions(instructions, bundler);
};

function bundleOtherScripts(instructions, bundler) {
  for (var key in instructions.files) {
    addScriptsToBundle(key, instructions.files[key], bundler);
  }
}

function bundleModelScripts(instructions, bundler) {
  var files = instructions.models
    .map(function(m) { return m.sourceFile; })
    .filter(function(f) { return !!f; });

  var modelToFileMapping = instructions.models
    .map(function(m) { return files.indexOf(m.sourceFile); });

  addScriptsToBundle('models', files, bundler);

  // Update `sourceFile` properties with the new paths
  modelToFileMapping.forEach(function(fileIx, modelIx) {
    if (fileIx === -1) return;
    instructions.models[modelIx].sourceFile = files[fileIx];
  });
}

function addScriptsToBundle(name, list, bundler) {
  if (!list.length) return;

  var root = commondir(list.map(path.dirname));

  for (var ix in list) {
    var filepath = list[ix];

    // Build a short unique id that does not expose too much
    // information about the file system, but still preserves
    // useful information about where is the file coming from.
    var fileid = 'loopback-boot#' + name + '#' + path.relative(root, filepath);

    // Add the file to the bundle.
    bundler.require(filepath, { expose: fileid });

    // Rewrite the instructions entry with the new id that will be
    // used to load the file via `require(fileid)`.
    list[ix] = fileid;
  }
}

function bundleInstructions(instructions, bundler) {
  var instructionsString = JSON.stringify(instructions, null, 2);

  /* The following code does not work due to a bug in browserify
   * https://github.com/substack/node-browserify/issues/771
   var instructionsStream = require('resumer')()
     .queue(instructionsString);
   instructionsStream.path = 'boot-instructions';
   b.require(instructionsStream, { expose: 'loopback-boot#instructions' });
   */

  // Write the instructions to a file in our node_modules folder.
  // The location should not really matter as long as it is .gitignore-ed
  var instructionsFile = path.resolve(__dirname,
    '..', 'node_modules', 'instructions.json');

  fs.writeFileSync(instructionsFile, instructionsString, 'utf-8');
  bundler.require(instructionsFile, { expose: 'loopback-boot#instructions' });
}
