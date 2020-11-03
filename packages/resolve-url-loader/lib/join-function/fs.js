/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

/**
 * Webpack `fs` from `enhanced-resolve` doesn't support `existsSync()` so we shim using `statsSync()`.
 *
 * @param {{statSync:function(string):boolean}} webpackFs The webpack `fs` from `loader.fs`.
 * @param {string} absolutePath Absolute path to the file in question
 * @returns {boolean} True where file exists, else False
 */
function testIsFile(webpackFs, absolutePath) {
  try {
    return webpackFs.statSync(absolutePath).isFile();
  } catch (e) {
    return false;
  }
}

exports.testIsFile = testIsFile;
