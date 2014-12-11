var execute = require('./lib/executor');

/**
 * The browser version of `bootLoopBackApp`.
 *
 * When loopback-boot is loaded in browser, the module exports this
 * function instead of `bootLoopBackApp`.
 *
 * The function expects the boot instructions to be included in
 * the browser bundle, see `boot.compileToBrowserify`.
 *
 * @param {Object} app The loopback app to boot, as returned by `loopback()`.
 *
 * @header boot(app)
 */

exports = module.exports = function bootBrowserApp(app) {
  // The name of the module containing instructions
  // is hard-coded in lib/bundler
  var instructions = require('loopback-boot#instructions');
  execute(app, instructions);
};

exports.execute = execute;
