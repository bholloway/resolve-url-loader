/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path     = require('path'),
    Iterator = require('es6-iterator'),
    Symbol   = require('es6-symbol');

var PACKAGE_NAME = require('../package.json').name;

/**
 * Webpack `fs` from `enhanced-resolve` doesn't support `existsSync()` so we shim using `statsSync()`.
 *
 * @param {{statSync:function(string):boolean}} webpackFs The webpack `fs` from `loader.fs`.
 * @param {string} absolutePath Absolute path to the file in question
 * @returns {boolean} True where file exists, else False
 */
function testIsFile(webpackFs, absolutePath) {
  try {
    return webpackFs.statSync(absolutePath).isFile();
  } catch (e) {
    return false;
  }
}

exports.testIsFile = testIsFile;

/**
 * The default factory will order `subString` then `value` then `property` then `selector`.
 *
 * @param {string} _filename (unused) The currently processed file
 * @param {{subString:string, value:string, property:string, selector:string}|null} bases A hash of possible base paths
 * @param {{fs:Object, root:string}} options The loader options including webpack file system
 * @returns {Array<string>} An iterable of possible base paths in preference order
 */
function defaultJoinFactory(_filename, bases, options) {
  return bases ? [bases.subString, bases.value, bases.property, bases.selector] : [options.root];
}

exports.defaultJoinFactory = defaultJoinFactory;

/**
 * The default predicate simply joins the given base to the uri and returns it where it exists.
 *
 * The result of `next()` represents the eventual result and needs to be returned otherwise.
 *
 * If none of the expected files exist then the first candidate is returned as a "default" value, even if it doesn't
 * exist.
 *
 * @param {string} _filename (unused) The currently processed file
 * @param {string} uri The value in the url() statement being processed
 * @param {string} base A possible base path
 * @param {number} i The index in the iterator
 * @param {function(string|null):string} next Rerun with the next value from the iterator, with possible default result
 * @param {{fs:Object, root:string}} options The loader options including webpack file system
 * @returns {*}
 */
function defaultJoinPredicate(_filename, uri, base, i, next, options) {
  var absolute = path.normalize(path.join(base, uri)),
      isFile   = testIsFile(options.fs, absolute);
  return isFile ? absolute : next((i === 0) ? absolute : null);
}

exports.defaultJoinPredicate = defaultJoinPredicate;

/**
 * The default join function iterates over possible base paths until a suitable join is found.
 *
 * The first base path is used as fallback for the case where none of the base paths can locate the actual file.
 *
 * @type {function}
 */
exports.defaultJoin = createJoinFunction(
  'defaultJoin',
  defaultJoinFactory,
  defaultJoinPredicate
);

/**
 * Define a join function by `factory` and `predicate` functions.
 *
 * You can write a much simpler function than this if you have specific requirements. But it can also be useful to just
 * write custom `factory` or `predicate` functions.
 *
 * The `factory` is called for relative URIs to order/iterate the possible base paths. It is of the form:
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
 * The `predicate` is applied to each value of the iterator given by the `factory` as a possible base path.
 * The `predicate` tests the base against the URI and determines whether it is a match.
 *
 * ```
 * function(filename, uri, base, i, next, options):string|null
 * ```
 *
 * where
 * - `filename` The currently processed file
 * - `uri` The value in the url() statement being processed
 * - `base` A possible base path
 * - `i` The index in the iterator
 * - `next` Rerun with the next value from the iterator, passing default result
 * - `options` The loader options (including webpack `fs`)
 *
 * returns
 * - an absolute path on success
 * - a call to `next(null)` on failure
 * - a call to `next(absolute)` on failure where absolute is placeholder
 *
 * The string argument `x` given in the last `next(x)` call is used if success does not eventually occur.
 *
 * The `filename` value is typically unused but useful if you would like to differentiate behaviour.
 *
 * @param {string} name Name for the resulting join function
 * @param {function(Object):Iterator<string>} factory A function that takes the hash of base paths from the `engine` and
 *  returns ordered iteratable of paths to consider
 * @param {function} predicate A function that tests values and returns joined paths
 */
function createJoinFunction(name, factory, predicate) {
  /**
   * A factory for a join function with logging.
   *
   * @param {string} filename The current file being processed
   * @param {{fs:Object, debug:function|boolean, root:string}} options An options hash
   */
  function join(filename, options) {
    var log = createDebugLogger(options.debug);

    /**
     * Join function proper.
     *
     * For absolute uri only `uri` will be provided and no `bases`.
     *
     * @param {string} uri A uri path, relative or absolute
     * @param {{subString:string, value:string, property:string, selector:string}} [maybeBases] Optional hash of
     *  possible base paths
     * @return {string} Just the uri where base is empty or the uri appended to the base
     */
    return function joinProper(uri, bases) {
      var iterator = sanitiseIterable(factory(filename, bases, options)),
          result   = runIterator(createAccumulator());

      log(createJoinMsg, [filename, uri, result.list, result.isFound]);

      return (typeof result.absolute === 'string') ? result.absolute : uri;

      /**
       * Run the next iterator value and use the accumulator.
       *
       * @param {{isAccumulator:true, list:Array<string>, isFound:boolean, absolute:string, length:number,
       *  append:function, placeholder:function, complete:function}} accumulator The accumulator
       * @returns {{isAccumulator:true, list:Array<string>, isFound:boolean, absolute:string, length:number,
       *  append:function, placeholder:function, complete:function}}
       */
      function runIterator(accumulator) {
        var nextItem = iterator.next();
        var base     = !nextItem.done && nextItem.value;
        var isValid  = (typeof base === 'string');

        if (isValid) {
          var pending       = predicate(filename, uri, base, accumulator.length, next, options);
          var isPathString  = (typeof pending === 'string') && path.isAbsolute(pending),
              isAccumulator = pending && (typeof pending === 'object') && pending.isAccumulator;

          if (isPathString) {
            // append happens here on success
            return accumulator.append(base).found(pending);
          } else if (isAccumulator) {
            // a next() was called internally to the predicate() giving the return value of the accumulator
            return pending;
          } else {
            throw new Error('predicate must return an absolute path or the result of calling next()');
          }
        } else {
          // iterator exhausted or badly formed
          return accumulator;
        }

        function next(value) {
          // append happens here on failure
          return runIterator(accumulator.append(base).placeholder(value));
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

/**
 * A utility to ensure the given value is an Iterator.
 *
 * Where an Array is given its value are filtered to be Unique and Truthy.
 *
 * @throws TypeError where not Array or Iterator
 * @param {Array|Iterator} candidate The value to consider
 * @returns {Iterator} An iterator
 */
function sanitiseIterable(candidate) {
  if (Array.isArray(candidate)) {
    return new Iterator(candidate.filter(isString).filter(isUnique));
  } else if (candidate && (typeof candidate === 'object') && candidate[Symbol.iterator]) {
    return candidate;
  } else {
    throw new TypeError('expected Array<string>|Iterator<string>');
  }

  function isString(v) {
    return (typeof v === 'string');
  }

  function isUnique(v, i, a) {
    return a.indexOf(v) === i;
  }
}

exports.sanitiseIterable = sanitiseIterable;

/**
 * Format a debug message.
 *
 * @param {string} file The file being processed by webpack
 * @param {string} uri A uri path, relative or absolute
 * @param {Array<string>} bases Absolute base paths up to and including the found one
 * @param {boolean} isFound Indicates the last base was a positive match
 * @return {string} Formatted message
 */
function createJoinMsg(file, uri, bases, isFound) {
  return [PACKAGE_NAME + ': ' + pathToString(file) + ': ' + uri]
    .concat(bases.map(pathToString).filter(Boolean))
    .concat(isFound ? 'FOUND' : 'NOT FOUND')
    .join('\n  ');

  /**
   * If given path is within `process.cwd()` then show relative posix path, otherwise show absolute posix path.
   *
   * @param {string} absolute An absolute path
   * @return {string} A relative or absolute path
   */
  function pathToString(absolute) {
    if (!absolute) {
      return '-empty-';
    } else {
      var relative = path.relative(process.cwd(), absolute)
        .split(path.sep);

      return ((relative[0] === '..') ? absolute.split(path.sep) : ['.'].concat(relative).filter(Boolean))
        .join('/');
    }
  }
}

exports.createJoinMsg = createJoinMsg;

/**
 * A factory for a log function predicated on the given debug parameter.
 *
 * The logging function created accepts a function that formats a message and parameters that the function utilises.
 * Presuming the message function may be expensive we only call it if logging is enabled.
 *
 * The log messages are de-duplicated based on the parameters, so it is assumed they are simple types that stringify
 * well.
 *
 * @param {function|boolean} debug A boolean or debug function
 * @return {function(function, array)} A logging function possibly degenerate
 */
function createDebugLogger(debug) {
  var log = !!debug && ((typeof debug === 'function') ? debug : console.log);
  var cache = {};
  return log ? actuallyLog : noop;

  function noop() {}

  function actuallyLog(msgFn, params) {
    var key = Function.prototype.toString.call(msgFn) + JSON.stringify(params);
    if (!cache[key]) {
      cache[key] = true;
      log(msgFn.apply(null, params));
    }
  }
}

exports.createDebugLogger = createDebugLogger;

/**
 * Create a fluent data type for accumulating data in the iterator.
 *
 * Values may be `append()`ed to the `list` and assigned to `absolute`. The `placeholder()` assignment will not set
 * `isFound` and may be called multiple times, The `found()` assignment will set `isFound` and locks the instance.
 *
 * @param {{list:Array<string>, isFound:boolean, absolute:string}} context
 * @returns {{isAccumulator:true, list:Array<string>, isFound:boolean, absolute:string, length:number,
 *  append:function, placeholder:function, found:function}}
 */
function createAccumulator(context) {
  var self = {
    get isAccumulator() {
      return true;
    },
    get list() {
      return context && context.list || [];
    },
    get isFound() {
      return context && context.isFound || false;
    },
    get absolute() {
      return context && context.absolute || null;
    },
    get length() {
      return self.list.length;
    },
    append(value) {
      return self.isFound ?
        self :
        createAccumulator({
          list    : self.list.concat(value),
          isFound : self.isFound,
          absolute: self.absolute
        });
    },
    placeholder(value) {
      return self.isFound ?
        self :
        createAccumulator({
          list    : self.list,
          isFound : false,
          absolute: value
        });
    },
    found(value) {
      return self.isFound ?
        self :
        createAccumulator({
          list    : self.list,
          isFound : true,
          absolute: value
        });
    }
  };

  return self;
}

exports.createAccumulator = createAccumulator;
