/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path = require('path');

var findFile = require('./find-file');

/**
 * Convert each relative URI in the given sources array to absolute URI and return the base path common to all relative
 * URIs where present.
 * @throws {Error} On missing sources or inconsistent source base-path
 * @param {Array} sources The source map sources array
 * @param {string} defaultBasePath The base path to first try for relative URIs
 * @param {string} [limit] Optional directory to limit the search to
 * @returns {string} The base path common to all relative source URIs or the given path where all are absolute
 */
module.exports = function sourcesRelativeToAbsolute(sources, defaultBasePath, limit) {
  return sources
    .map(sourceToAbsolute)
    .filter(Boolean)
    .reduce(reduceBasePaths, defaultBasePath);

  /**
   * Convert the given URI to absolute path (in place) and return any base path used with relative URIs
   * @param {string} value The URI to consider
   * @returns {string|null} The base path used for relative URIs else <code>null</code>
   */
  function sourceToAbsolute(value, i, array) {

    // badly formed absolute (missing a leading slash) due to
    //  https://github.com/webpack/webpack-dev-server/issues/266
    if (value.indexOf(process.cwd().slice(1)) === 0) {
      array[i] = '/' + value;
    }
    // not absolute
    else if (value.indexOf(process.cwd()) !== 0) {
      var location = value
        .replace(/\b[\\\/]+\b/g, path.sep) // remove duplicate slashes (windows)
        .replace(/^[\\\/]\./, '.'),        // remove erroneous leading slash on relative paths
          basePath = findFile.base(defaultBasePath, location, limit);

      // file was found, now resolve the absolute path
      if (basePath) {
        array[i] = path.resolve(basePath, location);
        return basePath;
      }
      // file not found implies an error
      else {
        throw new Error('cannot find one or more sources listed in the incoming source-map');
      }
    }

    // not relative
    return null;
  }

  /**
   * Ensure that all relative URIs have the same base path otherwise throw an Error
   * @throws {Error} On inconsistent base bath for relative URIs
   * @param {string} reduced The current common base path
   * @param {string} value The current base path
   * @returns {string} The base path shared by all values
   */
  function reduceBasePaths(reduced, value) {

    // empty or consistent reduction
    if (!reduced || (reduced === value)) {
      return value;
    }
    // inconsistent implies an error
    else {
      throw new Error('cannot establish a common base path for all sources in the incoming source-map');
    }
  }
};