/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path              = require('path'),
    fs                = require('fs'),
    loaderUtils       = require('loader-utils'),
    camelcase         = require('camelcase'),
    defaults          = require('lodash.defaults'),
    SourceMapConsumer = require('source-map').SourceMapConsumer;

var adjustSourceMap = require('adjust-sourcemap-loader/lib/process');

var valueProcessor = require('./lib/value-processor');
var joinFn = require('./lib/join-fn');

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
  var loader = this;

  // a relative loader.context is a problem
  if (/^\./.test(loader.context)) {
    return handleException(
      'webpack misconfiguration',
      'loader.context is relative, expected absolute',
      true
    );
  }

  // webpack 1: prefer loader query, else options object
  // webpack 2: prefer loader options
  // webpack 3: deprecate loader.options object
  // webpack 4: loader.options no longer defined
  var options = defaults(
    loaderUtils.getOptions(loader),
    !!loader.options && loader.options[camelcase(PACKAGE_NAME)],
    {
      absolute : false,
      sourceMap: loader.sourceMap,
      engine   : 'rework',
      silent   : false,
      keepQuery: false,
      join     : joinFn.simpleJoin,
      root     : null
    }
  );

  // defunct options
  if ('debug' in options) {
    handleException(
      'loader misconfiguration',
      '"debug" option is defunct (use "join" option set to loader.verboseJoin)',
      false
    );
  }
  if ('attempts' in options) {
    handleException(
      'loader misconfiguration',
      '"attempts" option is defunct (consider "join" option if search is needed)',
      false
    );
  }
  if ('includeRoot' in options) {
    handleException(
      'loader misconfiguration',
      '"includeRoot" option is defunct (consider "join" option if search is needed)',
      false
    );
  }
  if ('fail' in options) {
    handleException(
      'loader misconfiguration',
      '"fail" option is discontinued',
      false
    );
  }

  // validate join option
  if (typeof options.join !== 'function') {
    return handleException(
      'loader misconfiguration',
      '"join" option must be a Function',
      true
    );
  } else if (options.join.length !== 2) {
    return handleException(
      'loader misconfiguration',
      '"join" Function must take exactly 2 arguments',
      true
    );
  }

  // validate root directory, where specified
  var resolvedRoot = (typeof options.root === 'string') && path.resolve(options.root) || undefined,
      isValidRoot  = resolvedRoot && fs.existsSync(resolvedRoot) && fs.statSync(resolvedRoot).isDirectory();
  if (options.root && !isValidRoot) {
    return handleException(
      'loader misconfiguration',
      '"root" option does not resolve to a valid directory',
      true
    );
  }

  // loader result is cacheable
  loader.cacheable();

  // incoming source-map
  var sourceMapConsumer, absSourceMap;
  if (sourceMap) {

    // support non-standard string encoded source-map (per less-loader)
    if (typeof sourceMap === 'string') {
      try {
        sourceMap = JSON.parse(sourceMap);
      }
      catch (exception) {
        return handleException(
          'source-map error',
          'cannot parse source-map string (from less-loader?)',
          true
        );
      }
    }

    // leverage adjust-sourcemap-loader's codecs to avoid having to make any assumptions about the sourcemap
    //  historically this is a regular source of breakage
    try {
      absSourceMap = adjustSourceMap(loader, {format: 'absolute'}, sourceMap);
    }
    catch (exception) {
      return handleException(
        'source-map error',
        exception.message,
        true
      );
    }

    // prepare the adjusted sass source-map for later look-ups
    sourceMapConsumer = new SourceMapConsumer(absSourceMap);
  }

  // choose a CSS engine
  var enginePath    = /^\w+/.test(options.engine) && path.join(__dirname, 'lib', 'engine', options.engine + '.js');
  var isValidEngine = fs.existsSync(enginePath);
  if (!isValidEngine) {
    return handleException(
      'loader misconfiguration',
      '"engine" option is not valid',
      true
    );
  }

  // process async
  var callback = loader.async();
  Promise
    .resolve(require(enginePath)(loader.resourcePath, content, {
      outputSourceMap     : !!options.sourceMap,
      transformDeclaration: valueProcessor(loader.context, options),
      absSourceMap,
      sourceMapConsumer
    }))
    .then(onSuccess)
    .catch(onFailure);

  function onSuccess(reworked) {
    // complete with source-map
    //  source-map sources are relative to the file being processed
    if (options.sourceMap) {
      var finalMap = adjustSourceMap(loader, {format: 'sourceRelative'}, reworked.map);
      callback(null, reworked.content, finalMap);
    }
    else {
      callback(null, reworked.content);
    }
  }

  function onFailure(error) {
    callback(null, handleException('Error in CSS', error, true));
  }

  /**
   * Push an error for the given exception and return the original content.
   * @param {string} label Summary of the error
   * @param {string|Error} [exception] Optional extended error details
   * @param {boolean} [isCritical] Optionally force display
   * @returns {string} The original CSS content
   */
  function handleException(label, exception, isCritical) {
    var rest = (typeof exception === 'string') ? [exception] :
               (exception instanceof Error) ? [exception.message, exception.stack.split('\n')[1].trim()] :
               [];
    var instance = new Error(PACKAGE_NAME + ' cannot operate: ' + [label].concat(rest).filter(Boolean).join('\n  '));
    if (isCritical) {
      loader.emitError(instance);
    }
    else if (!options.silent) {
      loader.emitWarning(instance);
    }
    return content;
  }

}

module.exports = Object.assign(resolveUrlLoader, joinFn);
