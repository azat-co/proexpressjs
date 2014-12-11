var browserify = require('browserify');
var uglify = require('uglify-js');
var convertSourceMap = require('convert-source-map');

var util;
module.exports = function(racer) {
  racer.Store.prototype.bundle = bundle;
  util = racer.util;
};

function bundle(file, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = null;
  }
  options || (options = {});
  options.debug = true;
  var minify = (options.minify == null) ? util.isProduction : options.minify;

  var b = browserify(options);
  this.emit('bundle', b);
  b.add(file);

  b.bundle(options, function(err, source) {
    if (err) return cb(err);
    // Extract the source map, which Browserify includes as a comment
    var map = convertSourceMap.fromSource(source).toJSON();
    source = convertSourceMap.removeComments(source);
    if (!minify) return cb(null, source, map);

    options.fromString = true;
    options.outSourceMap = 'map';
    // If inSourceMap is a string it is assumed to be a filename, but passing
    // in as an object avoids the need to make a file
    options.inSourceMap = JSON.parse(map);
    var result = uglify.minify(source, options);

    // Uglify doesn't include the source content in the map, so copy over from
    // the map that browserify generates
    var mapObject = JSON.parse(result.map);
    mapObject.sourcesContent = options.inSourceMap.sourcesContent;
    cb(null, result.code, JSON.stringify(mapObject));
  });
}
