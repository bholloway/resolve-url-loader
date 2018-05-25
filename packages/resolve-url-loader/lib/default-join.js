/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path    = require('path'),
    fs      = require('fs'),
    compose = require('compose-function');

var PACKAGE_NAME = require('../package.json').name;

module.exports = function (options) {
  var join = compose(path.normalize, path.join);
  var log = (typeof options.debug === 'function') && options.debug || !!options.debug && console.log;
  return log ? verboseJoin : join;

  function verboseJoin(base, uri) {
    var absolute = join(base, uri);

    if (fs.existsSync(absolute)) {
      flushMessages('FOUND');
    } else {
      flushMessages('NOT FOUND');
    }

    return absolute;

    /**
     * Print verbose debug info where <code>options.debug</code> is in effect.
     * @param {string} result Final text to append to the message
     */
    function flushMessages(result) {
      var text = ['\n' + PACKAGE_NAME + ': ' + uri]
        .concat(result)
        .join('\n  ');
      log(text);
    }
  }
};
