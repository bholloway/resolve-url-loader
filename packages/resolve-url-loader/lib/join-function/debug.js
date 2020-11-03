/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path = require('path');

var PACKAGE_NAME = require('../../package.json').name;

/**
 * Format a debug message.
 *
 * @param {string} file The file being processed by webpack
 * @param {string} uri A uri path, relative or absolute
 * @param {Array<string>} bases Absolute base paths up to and including the found one
 * @param {boolean} isFound Indicates the last base was a positive match
 * @return {string} Formatted message
 */
function formatJoinMessage(file, uri, bases, isFound) {
  return [PACKAGE_NAME + ': ' + pathToString(file) + ': ' + uri]
    .concat(bases.map(pathToString))
    .concat(isFound ? 'FOUND' : 'NOT FOUND')
    .join('\n  ');

  /**
   * If given path is within `process.cwd()` then show relative posix path, otherwise show absolute posix path.
   *
   * @param {string} absolute An absolute path
   * @return {string} A relative or absolute path
   */
  function pathToString(absolute) {
    if (!absolute) {
      return '-empty-';
    } else {
      var relative = path.relative(process.cwd(), absolute)
        .split(path.sep);

      return ((relative[0] === '..') ? absolute.split(path.sep) : ['.'].concat(relative).filter(Boolean))
        .join('/');
    }
  }
}

exports.formatJoinMessage = formatJoinMessage;

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
 * @return {function(function, array):void} A logging function possibly degenerate
 */
function createDebugLogger(debug) {
  var log = !!debug && ((typeof debug === 'function') ? debug : console.log);
  var cache = {};
  return log ? actuallyLog : noop;

  function noop() {}

  function actuallyLog(msgFn, params) {
    var key = Function.prototype.toString.call(msgFn) + JSON.stringify(params);
    if (!cache[key]) {
      cache[key] = true;
      log(msgFn.apply(null, params));
    }
  }
}

exports.createDebugLogger = createDebugLogger;
