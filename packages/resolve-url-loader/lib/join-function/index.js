/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path = require('path');

var fs               = require('./fs'),
    sanitiseIterable = require('./sanitise-iterable'),
    debug            = require('./debug');

/**
 * The default iterable factory will order `subString` then `value` then `property` then `selector`.
 *
 * @param {{fs:Object, root:string}} options The loader options including webpack file system
 * @param {string} _filename (unused) The currently processed file
 * @param {{subString:string, value:string, property:string, selector:string}|null} bases A hash of possible base paths
 * @returns {Array<string>} An iterable of possible base paths in preference order
 */
function defaultJoinIterator(_filename, bases, options) {
  return bases ? [bases.subString, bases.value, bases.property, bases.selector] : [options.root];
}

exports.defaultJoinIterator = defaultJoinIterator;

/**
 * The default operation simply joins the given base to the uri and returns it where it exists.
 *
 * The result of `next()` represents the eventual result and needs to be returned otherwise.
 *
 * If none of the expected files exist then the first candidate is returned as a "default" value, even if it doesn't
 * exist.
 *
 * @param {{filename:string, uri:string, base:string}} value The filename and uri with the i-th base from the iterator.
 * @param {function(?string):<string|Array<string>>} next Rerun with the next value from the iterator, with possible
 *  fallback result
 * @param {{fs:Object, root:string}} options The loader options including webpack file system
 * @returns {string|Array<string>}
 */
function defaultJoinOperation(value, next, options) {
  var absolute = path.normalize(path.join(value.base, value.uri)),
      isFile   = fs.testIsFile(options.fs, absolute);
  return isFile ? absolute : next(absolute);
}

exports.defaultJoinOperation = defaultJoinOperation;

/**
 * The default join function iterates over possible base paths until a suitable join is found.
 *
 * The first base path is used as fallback for the case where none of the base paths can locate the actual file.
 *
 * @type {function}
 */
exports.defaultJoin = createJoinFunction(
  'defaultJoin',
  defaultJoinIterator,
  defaultJoinOperation
);

/**
 * A utility to create a join function by `iteratble` and `operation` functions.
 *
 * The internal workings are a little complicated to allow the iterator to be executed lazily. As such your `iterable`
 * can perform costly operations such as a file system search.
 *
 * The `createIterator` is called for relative URIs to order/iterate the possible base paths. It is of the form:
 *
 * ```
 * function(filename, bases, options):Array<string>|Iterator<string>
 * ```
 *
 * where
 * - `filename` The currently processed file
 * - `bases` A hash of possible base paths or `null` for absolute URIs
 * - `options` The loader options (including webpack `fs`)
 *
 * returns
 * - an ordered Array or Iterator of possible base path strings, usually an enumeration of `bases`
 *
 * The `operation` is applied to each value of the iterator given by the `iteratble`. It should test each as a possible
 * base path against the URI and determine whether there is is a match. It may join the final path however it pleases.
 *
 * Where there is no match it should call the given `next()` method. The `next()` may be given an absolute path as an
 * optional fallback. Where there is no match the first fallback is used.
 *
 * ```
 * function({filename, uri, base}, next, options):string|null
 * ```
 *
 * where
 * - `filename` The currently processed file
 * - `uri` The value in the url() statement being processed
 * - `base` A possible base path
 * - `next` Rerun with the next value from the iterator, optionally passing fallback result
 * - `options` The loader options (including webpack `fs`)
 *
 * returns
 * - an absolute path on success
 * - a call to `next(absolute)` on failure where `absolute` is and optional fallback
 *
 * The `filename` argument is typically unused but useful if you would like to differentiate behaviour.
 *
 * @param {string} name Name for the resulting join function
 * @param {function(string, {subString:string, value:string, property:string, selector:string}, Object):
 *  (Array<string>|Iterator<string>)} createIterator A function that takes the hash of base paths from the `engine` and
 *  returns ordered iteratable of paths to consider
 * @param {function({filename:string, uri:string, base:string}, function(?string):<string|Array<string>>,
 *  {fs:Object, root:string}):(string|Array<string>)} operation A function that tests values and returns joined paths
 * @returns {function(string, {fs:Object, debug:function|boolean, root:string}):
 *  (function(string, {subString:string, value:string, property:string, selector:string}):string)} join function factory
 */
function createJoinFunction(name, createIterator, operation) {
  /**
   * A factory for a join function with logging.
   *
   * @param {string} filename The current file being processed
   * @param {{fs:Object, debug:function|boolean, root:string}} options An options hash
   */
  function join(filename, options) {
    var log = debug.createDebugLogger(options.debug);

    /**
     * Join function proper.
     *
     * For absolute uri only `uri` will be provided and no `bases`.
     *
     * @param {string} uri A uri path, relative or absolute
     * @param {{subString:string, value:string, property:string, selector:string}} bases? Optional hash of possible base
     *  paths
     * @return {string} Just the uri where base is empty or the uri appended to the base
     */
    return function joinProper(uri, bases) {
      var iterator   = sanitiseIterable(createIterator(filename, bases, options)),
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
          var base = assertAbsolute(nextItem.value, 'expected Iterator<string> of absolute base path', '');
          var pending = operation({filename, uri, base}, next, options);
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

  return Object.assign(join, name && {
    toString: toString,
    toJSON  : toString
  });
}

exports.createJoinFunction = createJoinFunction;
