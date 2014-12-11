'use strict';

/**
 * Module dependencies.
 */
var modelHelper = require('./model-helper');
var urlJoin = require('./url-join');

/**
 * Export the classHelper singleton.
 */
var classHelper = module.exports = {
  /**
   * Given a remoting class, generate an API doc.
   * See https://github.com/wordnik/swagger-spec/blob/master/versions/1.2.md#52-api-declaration
   * @param  {Class} aClass Strong Remoting class.
   * @param  {Object} opts Options (passed from Swagger(remotes, options))
   * @param  {String} opts.version API Version.
   * @param  {String} opts.swaggerVersion Swagger version.
   * @param  {String} opts.basePath Basepath (usually e.g. http://localhost:3000).
   * @param  {String} opts.resourcePath Resource path (usually /swagger/resources).
   * @return {Object}       API Declaration.
   */
  generateAPIDoc: function(aClass, opts) {
    return {
      apiVersion: opts.version,
      swaggerVersion: opts.swaggerVersion,
      basePath: opts.basePath,
      resourcePath: urlJoin('/', opts.resourcePath),
      apis: [],
      consumes: aClass.http.consumes || opts.consumes,
      produces: aClass.http.produces || opts.produces,
      models: modelHelper.generateModelDefinition(aClass.ctor, {})
    };
  },
  /**
   * Given a remoting class, generate a reference to an API declaration.
   * This is meant for insertion into the Resource declaration.
   * See https://github.com/wordnik/swagger-spec/blob/master/versions/1.2.md#512-resource-object
   * @param  {Class} aClass Strong Remoting class.
   * @return {Object}       API declaration reference.
   */
  generateResourceDocAPIEntry: function(aClass) {
    return {
      path: aClass.http.path,
      description: aClass.ctor.sharedCtor && aClass.ctor.sharedCtor.description
    };
  }
};
