/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path              = require('path'),
    loaderUtils       = require('loader-utils'),
    rework            = require('rework'),
    visit             = require('rework-visit'),
    SourceMapConsumer = require('source-map').SourceMapConsumer;

var findFile = require('./lib/find-file');

/**
 * A webpack loader that resolves absolute url() paths relative to their original source file.
 * Requires source-maps to do any meaningful work.
 * @param {string} content Css content
 * @param {object} sourceMap The source-map
 * @returns {string|String}
 */
module.exports = function loader(content, sourceMap) {
  /* jshint validthis:true */

  // path of the file being processed
  var filePath = this.context,
      options  = loaderUtils.parseQuery(this.query);

  // loader result is cacheable
  this.cacheable();

  // incoming source-map
  var sourceMapConsumer;
  if (sourceMap) {

    // adjust source-map
    sourceMap.sources
      .forEach(absolutePath);

    // prepare the adjusted sass source-map for later look-ups
    sourceMapConsumer = new SourceMapConsumer(sourceMap);
  }

  // process
  //  rework will throw on css syntax errors
  var FILENAME_PLACEHOLDER = '<filename>';
  try {
    return rework(content, { source: FILENAME_PLACEHOLDER })
      .use(reworkPlugin)
      .toString({
        sourcemap: this.sourceMap || options.sourceMap
      });
  }
  //  fail gracefully
  catch(exception) {
    var message = ('CSS syntax error (resolve-url-loader did not operate)' + exception.message)
        .replace(FILENAME_PLACEHOLDER, '');
    if (options.fail) {
      this.emitError(message);
    }
    else if (!options.silent) {
      this.emitWarning(message);
    }
    return content; // original content unchanged
  }

  /**
   * Convert each relative file in the given array to absolute path.
   */
  function absolutePath(value, i, array) {
    var location = value
      .replace(/^\//, '')             // no leading slash
      .replace(/\b\/+\b/g, '/');      // remove duplicate slashes
    array[i] = path.resolve(filePath, location);
  }

  /**
   * Plugin for css rework that follows SASS transpilation
   * @param {object} stylesheet AST for the CSS output from SASS
   */
  function reworkPlugin(stylesheet) {

    // visit each node (selector) in the stylesheet recursively using the official utility method
    //  each node may have multiple declarations
    visit(stylesheet, function visitor(declarations) {
      declarations
        .forEach(eachDeclaration);
    });

    /**
     * Process a declaration from the syntax tree.
     * @param declaration
     */
    function eachDeclaration(declaration) {
      var URL_STATEMENT_REGEX = /(url\s*\()\s*(?:(['"])((?:(?!\2).)*)(\2)|([^'"](?:(?!\)).)*[^'"]))\s*(\))/g;
      if (declaration.value) {

        // reverse the original source-map to find the original sass file
        var startPosApparent = declaration.position.start,
            startPosOriginal = sourceMapConsumer ? sourceMapConsumer.originalPositionFor({
              line  : startPosApparent.line,
              column: startPosApparent.column
            }) : startPosApparent,
            directory        = startPosOriginal && path.dirname(startPosOriginal.source);

        // we require a valid directory for the specified file
        if (!directory) {
          throw new Error('failed to decode source map');
        }

        // allow multiple url() values in the declaration
        //  split by url statements and process the content
        //  additional capture groups are needed to match quotations correctly
        //  escaped quotations are not considered
        declaration.value = declaration.value
          .split(URL_STATEMENT_REGEX)
          .map(eachSplitOrGroup)
          .join('');
      }

      /**
       * Encode the content portion of <code>url()</code> statements.
       * There are 4 capture groups in the split making every 5th unmatched.
       * @param {string} token A single split item
       * @param i The index of the item in the split
       * @returns {string} Every 3 or 5 items is an encoded url everything else is as is
       */
      function eachSplitOrGroup(token, i) {

        // we can get groups as undefined under certain match circumstances
        var initialised = token || '';

        // the content of the url() statement is either in group 3 or group 5
        var mod = i % 7;
        if ((mod === 3) || (mod === 5)) {

          // remove query string or hash suffix
          var uri      = initialised.split(/[?#]/g).shift(),
              absolute = uri && findFile(directory, uri);

          // use the absolute path (or default to initialised)
          if (options.absolute) {
            return absolute || initialised;
          }
          // module relative path (or default to initialised)
          else {
            var relative     = absolute && path.relative(filePath, absolute),
                rootRelative = relative && loaderUtils.urlToRequest(relative, '~');
            return (rootRelative) ? rootRelative : initialised;
          }
        }
        // everything else, including parentheses and quotation (where present) and media statements
        else {
          return initialised;
        }
      }
    }
  }
};