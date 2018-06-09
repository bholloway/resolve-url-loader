/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path    = require('path'),
    fs      = require('fs'),
    compose = require('compose-function');

var PACKAGE_NAME = require('../package.json').name;

exports.simpleJoin = compose(path.normalize, path.join);

function verboseJoin(debug) {
  var log = (typeof debug === 'function') ? debug : console.log;

  return function (base, uri) {
    var absolute = exports.simpleJoin(base, uri);

    var text = ['\n' + PACKAGE_NAME + ': ' + uri]
      .concat(fs.existsSync(absolute) ? 'FOUND' : 'NOT FOUND')
      .join('\n  ');
    log(text);

    return absolute;
  };
}

exports.verboseJoin = verboseJoin;
