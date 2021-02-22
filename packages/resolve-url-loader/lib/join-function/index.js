/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path = require('path');

var sanitiseIterable = require('./sanitise-iterable'),
    debug            = require('./debug');

/**
 * Generated name from "flower" series
 * @see https://gf.dev/sprintname
 */
var CURRENT_SCHEME = require('../../package.json').scheme;

/**
 * Webpack `fs` from `enhanced-resolve` doesn't support `existsSync()` so we shim using `statsSync()`.
 *
 * @param {{statSync:function(string):{isFile:function():boolean}}} webpackFs The webpack `fs` from `loader.fs`.
 * @param {string} absolutePath Absolute path to the file in question
 * @returns {boolean} True where file exists, else False
 */
function webpackExistsSync(webpackFs, absolutePath) {
  try {
    return webpackFs.statSync(absolutePath).isFile();
  } catch (e) {
    return false;
  }
}

exports.webpackExistsSync = webpackExistsSync;

/**
 * The default iterable factory will order `subString` then `value` then `property` then `selector`.
 *
 * @param {string} filename The absolute path of the file being processed
 * @param {string} uri The uri given in the file webpack is processing
 * @param {boolean} isAbsolute True for absolute URIs, false for relative URIs
 * @param {{subString:string, value:string, property:string, selector:string}} bases A hash of possible base paths
 * @param {{fs:Object, root:string, debug:boolean|function}} options The loader options including webpack file system
 * @returns {Array<string>} An iterable of possible base paths in preference order
 */
function defaultJoinGenerator(filename, uri, isAbsolute, bases, options) {
  return  isAbsolute ? [options.root] : [bases.subString, bases.value, bases.property, bases.selector];
}

exports.defaultJoinGenerator = defaultJoinGenerator;

/**
 * The default operation simply joins the given base to the uri and returns it where it exists.
 *
 * The result of `next()` represents the eventual result and needs to be returned otherwise.
 *
 * If none of the expected files exist then any given `fallback` argument to `next()` is used even if it does not exist.
 *
 * @param {string} filename The absolute path of the file being processed
 * @param {string} uri The uri given in the file webpack is processing
 * @param {string} base A value from the iterator currently being processed
 * @param {function(?string):<string|Array<string>>} next Optionally set fallback then recurse next iteration
 * @param {{fs:Object, root:string, debug:boolean|function}} options The loader options including webpack file system
 * @returns {string|Array<string>} Result from the last iteration that occurred
 */
function defaultJoinOperation(filename, uri, base, next, options) {
  var absolute  = path.normalize(path.join(base, uri)),
      isSuccess = webpackExistsSync(options.fs, absolute) && options.fs.statSync(absolute).isFile();
  return isSuccess ? absolute : next(absolute);
}

exports.defaultJoinOperation = defaultJoinOperation;

/**
 * The default join function iterates over possible base paths until a suitable join is found.
 *
 * The first base path is used as fallback for the case where none of the base paths can locate the actual file.
 *
 * @type {function}
 */
exports.defaultJoin = createJoinFunction({
  name     : 'defaultJoin',
  scheme   : CURRENT_SCHEME,
  generator: defaultJoinGenerator,
  operation: defaultJoinOperation
});

/**
 * A utility to create a join function.
 *
 * Refer to implementation of `defaultJoinGenerator` and `defaultJoinOperation`.
 *
 * @param {string} name Name for the resulting join function
 * @param {string} scheme A keyword that confirms your implementation matches the current scheme.
 * @param {function(string, {subString:string, value:string, property:string, selector:string}, Object):
 *  (Array<string>|Iterator<string>)} generator A function that takes the hash of base paths from the `engine` and
 *  returns ordered iterable of paths to consider
 * @param {function({filename:string, uri:string, base:string}, function(?string):<string|Array<string>>,
 *  {fs:Object, root:string}):(string|Array<string>)} operation A function that tests values and returns joined paths
 * @returns {function(string, {fs:Object, debug:function|boolean, root:string}):
 *  (function(string, {subString:string, value:string, property:string, selector:string}):string)} join function factory
 */
function createJoinFunction({ name, scheme, generator, operation }) {
  if (typeof scheme !== 'string' || scheme.toLowerCase() !== CURRENT_SCHEME) {
    throw new Error(`Custom join function has changed, please update to the latest scheme. Refer to the docs.`);
  }

  /**
   * A factory for a join function with logging.
   *
   * Options are curried and a join function proper is returned.
   *
   * @param {{fs:Object, root:string, debug:boolean|function}} options The loader options including webpack file system
   */
  function join(options) {
    var log = debug.createDebugLogger(options.debug);

    /**
     * Join function proper.
     *
     * For absolute uri only `uri` will be provided and no `bases`.
     *
     * @param {string} filename The current file being processed
     * @param {string} uri A uri path, relative or absolute
     * @param {boolean} isAbsolute True for absolute URIs, false for relative URIs
     * @param {{subString:string, value:string, property:string, selector:string}} bases Hash of possible base paths
     * @return {string} Just the uri where base is empty or the uri appended to the base
     */
    return function joinProper(filename, uri, isAbsolute, bases) {
      var iterator   = sanitiseIterable(generator(filename, uri, isAbsolute, bases, options)),
          result     = reduceIterator({inputs:[], outputs:[], isFound:false}, iterator),
          lastOutput = result.outputs[result.outputs.length-1],
          fallback   = result.outputs.find(Boolean) || uri;

      log(debug.formatJoinMessage, [filename, uri, result.inputs, result.isFound]);

      return result.isFound ? lastOutput : fallback;

      /**
       * Run the next iterator value.
       *
       * @param {Array<string>} accumulator Current result
       * @returns {Array<string>} Updated result
       */
      function reduceIterator(accumulator) {
        var inputs   = accumulator.inputs  || [],
            outputs  = accumulator.outputs || [],
            nextItem = iterator.next();

        if (nextItem.done) {
          return accumulator;
        } else {
          var base    = assertAbsolute(nextItem.value, 'expected Iterator<string> of absolute base path', ''),
              pending = operation(filename, uri, base, next, options);
          if (!!pending && typeof pending === 'object') {
            return pending;
          } else {
            assertAbsolute(pending, 'operation must return an absolute path or the result of calling next()');
            return {
              inputs : inputs.concat(base),
              outputs: outputs.concat(pending),
              isFound: true
            };
          }
        }

        /**
         * Provide a possible fallback but run the next iteration either way.
         *
         * @param {string} fallback? Optional absolute path as fallback value
         * @returns {Array<string>} Nested result
         */
        function next(fallback) {
          assertAbsolute(fallback, 'next() expects absolute path string or no argument', null, undefined);
          return reduceIterator({
            inputs : inputs.concat(base),
            outputs: outputs.concat(fallback || []),
            isFound: false
          });
        }

        /**
         * Assert that the given value is an absolute path or some other accepted literal.
         *
         * @param {*} candidate Possible result
         * @param {string} message Error message
         * @param {...*} alsoAcceptable? Any number of simple values that are also acceptable
         * @throws An error with the given message where the candidate fails the assertion
         */
        function assertAbsolute(candidate, message, ...alsoAcceptable) {
          var isValid = (alsoAcceptable.indexOf(candidate) >= 0) ||
            (typeof candidate === 'string') && path.isAbsolute(candidate);
          if (!isValid) {
            throw new Error(message);
          }
          return candidate;
        }
      }
    };
  }

  function toString() {
    return '[Function ' + name + ']';
  }

  return Object.assign(join, !!name && {
    toString: toString,
    toJSON  : toString
  });
}

exports.createJoinFunction = createJoinFunction;
