/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path              = require('path'),
    loaderUtils       = require('loader-utils'),
    rework            = require('rework'),
    visit             = require('rework-visit'),
    convert           = require('convert-source-map'),
    SourceMapConsumer = require('source-map').SourceMapConsumer;

var findFile           = require('./lib/find-file'),
    absoluteToRelative = require('./lib/sources-absolute-to-relative'),
    relativeToAbsolute = require('./lib/sources-relative-to-absolute');

/**
 * A webpack loader that resolves absolute url() paths relative to their original source file.
 * Requires source-maps to do any meaningful work.
 * @param {string} content Css content
 * @param {object} sourceMap The source-map
 * @returns {string|String}
 */
module.exports = function resolveUrlLoader(content, sourceMap) {
  /* jshint validthis:true */

  // details of the file being processed
  var loader     = this,
      filePath   = loader.context,
      outputPath = loader.options.output.path,
      options    = loaderUtils.parseQuery(loader.query);

  // loader result is cacheable
  loader.cacheable();

  // incoming source-map
  var sourceMapConsumer, contentWithMap;
  if (sourceMap) {

    // sass-loader outputs source-map sources relative to output directory so start our search there
    try {
      relativeToAbsolute(sourceMap.sources, outputPath);
    } catch (exception) {
      handleException('source-map error', exception.message);
    }

    // prepare the adjusted sass source-map for later look-ups
    sourceMapConsumer = new SourceMapConsumer(sourceMap);

    // embed source-map in css for rework-css to use
    contentWithMap = content + convert.fromObject(sourceMap).toComment({multiline: true});
  }
  // absent source map
  else {
    contentWithMap = content;
  }

  // process
  //  rework-css will throw on css syntax errors
  var useMap = loader.sourceMap || options.sourceMap,
      reworked;
  try {
    reworked = rework(contentWithMap, {source: loader.resourcePath})
      .use(reworkPlugin)
      .toString({
        sourcemap        : useMap,
        sourcemapAsObject: useMap
      });
  }
    //  fail gracefully
  catch (exception) {
    return handleException('CSS error', exception.message);
  }

  // complete with source-map
  if (useMap) {

    // source-map sources seem to be relative to the file being processed
    absoluteToRelative(reworked.map.sources, filePath);

    // need to use callback when there are multiple arguments
    loader.callback(null, reworked.code, reworked.map);
  }
  // complete without source-map
  else {
    return reworked;
  }

  /**
   * Push an error for the given exception and return the original content.
   * @param {...string} messages
   * @returns {string} The original CSS content
   */
  function handleException() {
    var message = 'resolve-url-loader cannot operate: ' + Array.prototype.slice.call(arguments).join(' ');
    if (options.fail) {
      loader.emitError(message);
    }
    else if (!options.silent) {
      loader.emitWarning(message);
    }
    return content;
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
        if (directory) {

          // allow multiple url() values in the declaration
          //  split by url statements and process the content
          //  additional capture groups are needed to match quotations correctly
          //  escaped quotations are not considered
          declaration.value = declaration.value
            .split(URL_STATEMENT_REGEX)
            .map(eachSplitOrGroup)
            .join('');
        }
        // invalid source map
        else {
          throw new Error('source-map information is not available at url() declaration');
        }
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
              absolute = uri && findFile.absolute(directory, uri);

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