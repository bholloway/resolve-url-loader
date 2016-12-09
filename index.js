/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path              = require('path'),
    fs                = require('fs'),
    loaderUtils       = require('loader-utils'),
    rework            = require('rework'),
    visit             = require('rework-visit'),
    convert           = require('convert-source-map'),
    camelcase         = require('camelcase'),
    defaults          = require('lodash.defaults'),
    SourceMapConsumer = require('source-map').SourceMapConsumer;

var findFile           = require('./lib/find-file'),
    absoluteToRelative = require('./lib/sources-absolute-to-relative'),
    relativeToAbsolute = require('./lib/sources-relative-to-absolute');

var PACKAGE_NAME = require('./package.json').name;

/**
 * A webpack loader that resolves absolute url() paths relative to their original source file.
 * Requires source-maps to do any meaningful work.
 * @param {string} content Css content
 * @param {object} sourceMap The source-map
 * @returns {string|String}
 */
function resolveUrlLoader(content, sourceMap) {
  /* jshint validthis:true */

  // details of the file being processed
  //  we would normally use compilation.getPath(options.output.path) to get the most correct outputPath,
  //  however we need to match to the sass-loader and it does not do so
  var loader      = this,
      filePath    = loader.context,
      outputPath  = path.resolve(loader.options.output.path),
      contextPath = path.resolve(loader.options.context);

  // prefer loader query, else options object, else default values
  var options = defaults(loaderUtils.parseQuery(loader.query), loader.options[camelcase(PACKAGE_NAME)], {
    absolute : false,
    sourceMap: false,
    fail     : false,
    silent   : false,
    keepQuery: false,
    root     : null
  });

  // validate root directory
  var resolvedRoot = (typeof options.root === 'string') && path.resolve(options.root) || undefined,
      isValidRoot  = resolvedRoot && fs.existsSync(resolvedRoot);
  if (options.root && !isValidRoot) {
    return handleException('"root" option does not resolve to a valid path');
  }

  // loader result is cacheable
  loader.cacheable();

  // incoming source-map
  var sourceMapConsumer, contentWithMap, sourceRoot;
  if (sourceMap) {

    //when use less-loader the incoming sourceMap is string,need to parse it
    sourceMap = typeof sourceMap == 'string' ? JSON.parse(sourceMap) : sourceMap;

    // expect sass-loader@>=4.0.0
    //  sourcemap sources relative to context path
    try {
      relativeToAbsolute(sourceMap.sources, contextPath, resolvedRoot);
    }
    catch (unused) {

      // fallback to sass-loader@<4.0.0
      //  sourcemap sources relative to output path
      try {
        relativeToAbsolute(sourceMap.sources, outputPath, resolvedRoot);
      }
      catch (exception) {
        return handleException('source-map error', exception.message);
      }
    }

    // There are now absolute paths in the source map so we don't need it anymore
    // However, later when we go back to relative paths, we need to add it again
    sourceRoot = sourceMap.sourceRoot;
    sourceMap.sourceRoot = undefined;

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
    return handleException('CSS error', exception);
  }

  // complete with source-map
  if (useMap) {

    // source-map sources seem to be relative to the file being processed
    absoluteToRelative(reworked.map.sources, path.resolve(filePath, sourceRoot || '.'));

    // Set source root again
    reworked.map.sourceRoot = sourceRoot;

    // need to use callback when there are multiple arguments
    loader.callback(null, reworked.code, reworked.map);
  }
  // complete without source-map
  else {
    return reworked;
  }

  /**
   * Push an error for the given exception and return the original content.
   * @param {string} label Summary of the error
   * @param {string|Error} [exception] Optional extended error details
   * @returns {string} The original CSS content
   */
  function handleException(label, exception) {
    var rest = (typeof exception === 'string') ? [exception] :
               (exception instanceof Error) ? [exception.message, exception.stack.split('\n')[1].trim()] :
               [];
    var message = '  resolve-url-loader cannot operate: ' + [label].concat(rest).filter(Boolean).join('\n  ');
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
    var URL_STATEMENT_REGEX = /(url\s*\()\s*(?:(['"])((?:(?!\2).)*)(\2)|([^'"](?:(?!\)).)*[^'"]))\s*(\))/g;

    // visit each node (selector) in the stylesheet recursively using the official utility method
    //  each node may have multiple declarations
    visit(stylesheet, function visitor(declarations) {
      if (declarations) {
        declarations
          .forEach(eachDeclaration);
      }
    });

    /**
     * Process a declaration from the syntax tree.
     * @param declaration
     */
    function eachDeclaration(declaration) {
      var isValid = declaration.value && (declaration.value.indexOf('url') >= 0),
          directory;
      if (isValid) {

        // reverse the original source-map to find the original sass file
        var startPosApparent = declaration.position.start,
            startPosOriginal = sourceMapConsumer && sourceMapConsumer.originalPositionFor(startPosApparent);

        // we require a valid directory for the specified file
        directory = startPosOriginal && startPosOriginal.source && path.dirname(startPosOriginal.source);
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
        // source-map present but invalid entry
        else if (sourceMapConsumer) {
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
        var BACKSLASH_REGEX = /\\/g;

        // we can get groups as undefined under certain match circumstances
        var initialised = token || '';

        // the content of the url() statement is either in group 3 or group 5
        var mod = i % 7;
        if ((mod === 3) || (mod === 5)) {

          // split into uri and query/hash and then find the absolute path to the uri
          var split    = initialised.split(/([?#])/g),
              uri      = split[0],
              absolute = uri && findFile.absolute(directory, uri, resolvedRoot),
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
    }
  }
}

module.exports = resolveUrlLoader;
