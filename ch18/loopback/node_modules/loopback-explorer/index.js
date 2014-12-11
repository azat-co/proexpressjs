  'use strict';
/*!
 * Adds dynamically-updated docs as /explorer
 */
var url = require('url');
var path = require('path');
var urlJoin = require('./lib/url-join');
var _defaults = require('lodash.defaults');
var express = require('express');
var swagger = require('./lib/swagger');
var SWAGGER_UI_ROOT = require('swagger-ui').dist;
var STATIC_ROOT = path.join(__dirname, 'public');

module.exports = explorer;

/**
 * Example usage:
 *
 * var explorer = require('loopback-explorer');
 * app.use('/explorer', explorer(app, options));
 */

function explorer(loopbackApplication, options) {
  options = _defaults({}, options, {
    resourcePath: 'resources',
    apiInfo: loopbackApplication.get('apiInfo') || {}
  });

  var app = express();

  swagger(loopbackApplication, app, options);

  app.disable('x-powered-by');

  // config.json is loaded by swagger-ui. The server should respond
  // with the relative URI of the resource doc.
  app.get('/config.json', function(req, res) {
    // Get the path we're mounted at. It's best to get this from the referer
    // in case we're proxied at a deep path.
    var source = url.parse(req.headers.referer || '').pathname;
    // If no referer is available, use the incoming url.
    if (!source) {
      source = req.originalUrl.replace(/\/config.json(\?.*)?$/, '');
    }
    res.send({
      url: urlJoin(source, '/' + options.resourcePath)
    });
  });

  // Allow specifying a static file root for swagger files. Any files in 
  // that folder will override those in the swagger-ui distribution. 
  // In this way one could e.g. make changes to index.html without having 
  // to worry about constantly pulling in JS updates.
  if (options.swaggerDistRoot) {
    app.use(express.static(options.swaggerDistRoot));
  }
  // File in node_modules are overridden by a few customizations
  app.use(express.static(STATIC_ROOT));
  // Swagger UI distribution
  app.use(express.static(SWAGGER_UI_ROOT));

  return app;
}
