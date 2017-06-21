/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path        = require('path'),
    loaderUtils = require('loader-utils');

var findFile = require('./find-file');

/**
 * Create a value processing function for a given file path.
 * @param {string} filePath A path where we will search for urls
 * @param {{absolute: string, keepQuery: boolean, limit: string}} options Options hash
 * @return {process}
 */
function valueProcessor(filePath, options) {
  var URL_STATEMENT_REGEX = /(url\s*\()\s*(?:(['"])((?:(?!\2).)*)(\2)|([^'"](?:(?!\)).)*[^'"]))\s*(\))/g;

  /**
   * Process the given CSS declaration value (the RHS of the `:`)
   */
  return function transformValue(value, directory) {

    // allow multiple url() values in the declaration
    //  split by url statements and process the content
    //  additional capture groups are needed to match quotations correctly
    //  escaped quotations are not considered
    return value
      .split(URL_STATEMENT_REGEX)
      .map(eachSplitOrGroup)
      .join('');

    /**
     * Encode the content portion of <code>url()</code> statements.
     * There are 4 capture groups in the split making every 5th unmatched.
     * @param {string} token A single split item
     * @param i The index of the item in the split
     * @returns {string} Every 3 or 5 items is an encoded url everything else is as is
     */
    function eachSplitOrGroup(token, i) {
      var BACKSLASH_REGEX = /\\/g;

      // we can get groups as undefined under certain match circumstances
      var initialised = token || '';

      // the content of the url() statement is either in group 3 or group 5
      var mod = i % 7;
      if ((mod === 3) || (mod === 5)) {

        // split into uri and query/hash and then find the absolute path to the uri
        var split    = initialised.split(/([?#])/g),
            uri      = split[0],
            absolute = uri && findFile(options).absolute(directory, uri, options.limit),
            query    = options.keepQuery ? split.slice(1).join('') : '';

        // use the absolute path (or default to initialised)
        if (options.absolute) {
          return absolute && absolute.replace(BACKSLASH_REGEX, '/').concat(query) || initialised;
        }
        // module relative path (or default to initialised)
        else {
          var relative     = absolute && path.relative(filePath, absolute),
              rootRelative = relative && loaderUtils.urlToRequest(relative, '~');
          return (rootRelative) ? rootRelative.replace(BACKSLASH_REGEX, '/').concat(query) : initialised;
        }
      }
      // everything else, including parentheses and quotation (where present) and media statements
      else {
        return initialised;
      }
    }
  };
}

module.exports = valueProcessor;
