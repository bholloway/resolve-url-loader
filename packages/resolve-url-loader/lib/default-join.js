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
 * A factory for a join function with logging.
 *
 * @param {{debug:function|boolean}} options An options hash
 */
function defaultJoin(options) {
  var simpleJoin = compose(path.normalize, path.join);
  var log        = !!options.debug && ((typeof options.debug === 'function') ? options.debug : console.log);

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
      if (log) {
        log(
          ['\n' + PACKAGE_NAME + ': ' + uri]
            .concat(
              ['.']
                .concat(path.relative(process.cwd(), base).split(path.sep))
                .filter(Boolean)
                .join('/')
            )
            .concat(fs.existsSync(absolute) ? 'FOUND' : 'NOT FOUND')
            .join('\n  ')
        );
      }
      return absolute;
    }
  };
}

module.exports = defaultJoin;
