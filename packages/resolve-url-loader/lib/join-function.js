/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path    = require('path'),
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
   * @param {string|Array.<string>} maybeBase A relative or absolute base path, array thereof, or empty string
   * @param {string} uri A uri path, relative or absolute
   * @return {string} Just the uri where base is empty or the uri appended to the base
   */
  return function defaultJoinProper(maybeBase, uri) {
    if (!maybeBase) {
      return uri;
    } else {
      var candidates = [].concat(maybeBase);
      var absolutes  = candidates.map(joinToBase);
      var index      = absolutes.findIndex(fs.existsSync);
      var isFound    = (index >= 0);
      var filtered   = isFound ? candidates.slice(0, index + 1) : candidates;

      log(createJoinMsg, [filtered, uri, isFound]);

      return isFound ? absolutes[index] : absolutes[0];
    }

    function joinToBase(base) {
      return simpleJoin(base, uri);
    }
  };
}

exports.defaultJoin = defaultJoin;


/**
 * Format a debug message.
 *
 * @param {Array.<string>} bases Absolute base paths up to and including the found one
 * @param {string} uri A uri path, relative or absolute
 * @param {boolean} isFound Indicates the last base was correct
 * @return {string} Formatted message
 */
function createJoinMsg(bases, uri, isFound) {
  return [PACKAGE_NAME + ': ' + uri]
    .concat(bases.map(relativeBase))
    .concat(isFound ? 'FOUND' : 'NOT FOUND')
    .join('\n  ');

  function relativeBase(base) {
    var segments = path.relative(process.cwd(), base)
      .split(path.sep);

    return ['.']
      .concat(segments)
      .filter(Boolean)
      .join('/');
  }
}

exports.createJoinMsg = createJoinMsg;


/**
 * A factory for a log function predicated on the given debug parameter.
 *
 * The logging function created accepts a function that formats a message and parameters that the function utilises.
 * Presuming the message function may be expensive we only call it if logging is enabled.
 *
 * The log messages are de-duplicated based on the parameters, so it is assumed they are simple types that stringify
 * well.
 *
 * @param {function|boolean} debug A boolean or debug function
 * @return {function(function, array)} A logging function possibly degenerate
 */
function createDebugLogger(debug) {
  var log   = !!debug && ((typeof debug === 'function') ? debug : console.log);
  var cache = {};
  return log ? actuallyLog : noop;

  function noop() {}

  function actuallyLog(msgFn, params) {
    var key = JSON.stringify(params);
    if (!cache[key]) {
      cache[key] = true;
      log(msgFn.apply(null, params));
    }
  }
}

exports.createDebugLogger = createDebugLogger;
