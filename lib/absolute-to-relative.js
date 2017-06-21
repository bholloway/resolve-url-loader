/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path = require('path');

/**
 * Convert the given array of absolute URIs to relative URIs (in place).
 * @param {string} basePath The base path to make relative to
 * @return {function(string):string} transform function
 */
function absoluteToRelative(basePath) {
  return function sourceToRelative(value) {
    return path.relative(basePath, value);
  };
}

module.exports = absoluteToRelative;
