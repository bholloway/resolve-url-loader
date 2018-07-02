'use strict';

const sequence = require('promise-compose');
const getValue = require('get-value');
const {set: setValue} = require('object-path-immutable');
const {assign} = Object;

/**
 * A higher-order-function that times the base function
 *
 * @type {function(next:function):function(...*):Promise}
 */
exports.withTime = (next) => (...v) => {
  const start = process.hrtime();
  return Promise.resolve(next(...v))
    .then((obj) => {
      const [sec, nanosec] = process.hrtime(start);
      const time = sec * 1e3 + nanosec * 1e-6;
      return assign({}, obj, {time});
    });
};

/**
 * Cause the given function to act only on the given fields when invoked.
 *
 * Getter function is `v => vv`. Setter function is `v => vv => v'`.
 *
 * Any number of functions may be lensed as a sequence monad. The original value is available as a
 * a second argument to each function in the sequence. Additional arguments to the overall function
 * are available as additional arguments to each function.
 *
 * @param {string|function|Array.<string|function>} gets The field to get or a getter function
 * @param {string|function} set The field to set or a setter function
 * @return {function(...function):function(...*):Promise}
 */
exports.lens = (gets, set) => {
  const getters = [].concat(gets).map((get) =>
    (get === '*') && ((v) => v) ||
    (typeof get === 'string') && ((v) => getValue(v || {}, get)) ||
    (typeof get === 'function') && get ||
    exports.constant(undefined)
  );

  const setter =
    (set === '*') && (() => (vv) => vv) ||
    (typeof set === 'string') && ((v) => (vv) => setValue(v, set, vv)) ||
    (typeof set === 'function') && set ||
    ((v) => () => v);

  return (next) => (v, ...rest) => {
    const values = getters.map((get) => get(v));
    return Promise.resolve(next(...values, ...rest)).then(setter(v));
  };
};

/**
 * A higher-order-function where the given functions occur in sequence.
 *
 * It differs from simple promise-compose in that additional invariant arguments are applied to each element function.
 *
 * @param {...function} fns Any number of functions to perform sequentially
 * @retuns {function(...*):Promise}
 */
exports.sequence = (...fns) => (v, ...rest) =>
  sequence(
    ...fns.map((fn) =>
      (vv) => fn(vv, ...rest)
    )
  )(v);

/**
 * A higher-order-function where the given functions occur before the enhanced function.
 *
 * @param {...function} fns Any number of functions to perform first
 * @return {function(next:function):function(*):Promise}
 */
exports.doFirst = (...fns) => (next) =>
  exports.sequence(...fns, next);

/**
 * A higher-order-function where the given functions occur after the enhanced function.
 *
 * @param {...function} fns Any number of functions to perform last
 * @return {function(next:function):function(*):Promise}
 */
exports.doLast = (...fns) => (next) =>
  exports.sequence(next, ...fns);

/**
 * A higher-order-function where the given functions occur in sequence and their results are
 * accumulated in an array.
 *
 * Each function operates independently on one of the elements of the supplied array and any
 * additional arguments.
 *
 * @param {function} fn A function to execute on each element in a given array
 * @return {function(Array, ...*): Promise}
 */
exports.mapSerial = (fn) => (array, ...rest) =>
  sequence(
    ...array.map((element) =>
      (results) => Promise.resolve(fn(element, ...rest))
        .then((result) => results.concat(result))
    )
  )([]);

/**
 * A higher-order-function where the given functions occur in parallel and their results are
 * accumulated in an array.
 *
 * Each function operates independently on one of the elements of the supplied array and any
 * additional arguments.
 *
 * @param {function} fn A function to execute on each element in a given array
 * @return {function(Array, ...*): Promise}
 */
exports.mapParallel = (fn) => (array, ...rest) =>
  Promise.all(
    array.map((element) => Promise.resolve(fn(element, ...rest)))
  );

/**
 * A higher-order-function that always returns a promise to the given value.
 *
 * @param {*} value The value to return
 * @return {function(): Promise}
 */
exports.constant = (value) => () =>
  Promise.resolve(value);

/**
 * A higher-order-function that runs the given test function on given value and returns the
 * original value if the test function passes.
 *
 * @param {function} fn A test function
 * @return {function(*): Promise}
 */
exports.conditional = (fn) => (value) =>
  Promise.resolve(value)
    .then(fn)
    .then((result) => result && value);
