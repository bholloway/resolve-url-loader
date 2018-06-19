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
 * Normalise and join with exactly 2 arguments.
 */
exports.simpleJoin = (base, uri) =>
  compose(path.normalize, path.join)(base, uri);

/**
 * A factory for a join function with logging.
 */
function verboseJoin(debug) {
  var log = (typeof debug === 'function') ? debug : console.log;

  return function (base, uri) {
    var absolute = exports.simpleJoin(base, uri);

    var text = ['\n' + PACKAGE_NAME + ': ' + uri]
      .concat(path.relative(process.cwd(), base))
      .concat(fs.existsSync(absolute) ? 'FOUND' : 'NOT FOUND')
      .join('\n  ');
    log(text);

    return absolute;
  };
}

exports.verboseJoin = verboseJoin;
