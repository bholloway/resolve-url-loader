/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path = require('path'),
  fs = require('fs'),
  compose = require('compose-function');

var PACKAGE_NAME = require('../package.json').name;

/**
 * Normalise and join.
 *
 * @param {string} base An absolute base path
 * @param {string} uri A relative uri
 */
var simpleJoin = compose(path.normalize, path.join);

/**
 * A factory for a join function with logging.
 *
 * @param {{debug:function|boolean}} options An options hash
 */
function defaultJoin(options) {
  var log = !!options.debug && ((typeof options.debug === 'function') ? options.debug : console.log);

  return !log ?
    simpleJoin :
    function (base, uri) {
      var absolute = simpleJoin(base, uri);

      var text = ['\n' + PACKAGE_NAME + ': ' + uri]
        .concat(path.relative(process.cwd(), base))
        .concat(fs.existsSync(absolute) ? 'FOUND' : 'NOT FOUND')
        .join('\n  ');
      log(text);

      return absolute;
    };
}

module.exports = defaultJoin;
