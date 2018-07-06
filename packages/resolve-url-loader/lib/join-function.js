/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path  = require('path'),
  fs      = require('fs'),
  compose = require('compose-function');

var PACKAGE_NAME = require('../package.json').name;

/**
 * A factory for a join function with logging.
 *
 * @param {{debug:function|boolean}} options An options hash
 */
function defaultJoin(options) {
  var simpleJoin = compose(path.normalize, path.join);
  var log        = createDebugLogger(options.debug);

  /**
   * Join function proper.
   * @param {string} base A base path, relative or absolute or empty.
   * @param {string} uri A uri path, relative or absolute
   * @return {string} Just the uri where base is empty or the uri appended to the base
   */
  return function (base, uri) {
    if (!base) {
      return uri;
    } else {
      var absolute = simpleJoin(base, uri);
      log(createMsg, [base, uri, absolute]);
      return absolute;
    }
  };

  function createMsg(base, uri, absolute) {
    return [
      PACKAGE_NAME + ': ' + uri,
      ['.']
        .concat(path.relative(process.cwd(), base).split(path.sep))
        .filter(Boolean)
        .join('/'),
      fs.existsSync(absolute) ? 'FOUND' : 'NOT FOUND',
    ].join('\n  ');
  }
}

exports.defaultJoin = defaultJoin;


/**
 * A factory for a log function predicated on the given debug parameter.
 *
 * The logging function created accepts a function that creates a message and parameters that the function uses.
 *
 * The log messages are de-duplicated based on the parameters, so it is assumed they are simple types that stringify
 * well.
 *
 * @param {function|boolean} debug A boolean or debug function
 * @return {function(function, array)} A logging function possibly degenerate
 */
function createDebugLogger(debug) {
  var log = !!debug && ((typeof debug === 'function') ? debug : console.log);
  var logCache = {};
  return log ? actuallyLog : noop;

  function noop() {}

  function actuallyLog(msgFn, params) {
    var key = JSON.stringify(params);
    if (!logCache[key]) {
      logCache[key] = true;
      log(msgFn.apply(null, params));
    }
  }
}

exports.createDebugLogger = createDebugLogger;
