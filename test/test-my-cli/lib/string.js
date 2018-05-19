'use strict';

const {assign} = Object;

/**
 * A higher-order-function that adds indent to each line of the given strings.
 *
 * @param {number} n The number of spaces to indent
 * @return {function(...*): string}
 */
exports.indent = (n) => (...lines) =>
  lines
    .map((line) => String(line)
      .match(new RegExp(`.{1,${120 - n}}`, 'g'))
      .map((part, i) => ''.padStart(i ? (n + 2) : n) + part)
    )
    .reduce((line, parts) => line.concat(parts), [])
    .join('\n');

/**
 * Create a console.log() like method that can buffer messages until it is activated with a
 * destination.
 *
 * The activation may be given at time of creation. Or otherwise you must call
 * `.activate(boolean|function):void` at some later time to see accumulated output.
 *
 * The destination may be one of:
 * - false Stop buffering and do not log
 * - true Flush the buffer to console.log() and keep logging thereafter
 * - function Flush the buffer to fn() and keep logging thereafter
 *
 * @param {function|boolean} [destination] Optional logging function or enable flag
 * @return {function} A function with an additional activate() function attached
 */
exports.logger = (destination) => {
  const buffer = [];

  const maybeFlush = () => {
    if (destination === false) {
      buffer.splice(0, buffer.length);
    } else if (destination) {
      const method = (typeof destination === 'function') ? destination : console.log;
      buffer.splice(0, buffer.length)
        .forEach((args) => method(...args));
    }
  };

  const log = (...args) => {
    buffer.push(args);
    maybeFlush();
  };

  const activate = (fn) => {
    destination = fn;
    maybeFlush();
  };

  return assign(log, {activate});
};
