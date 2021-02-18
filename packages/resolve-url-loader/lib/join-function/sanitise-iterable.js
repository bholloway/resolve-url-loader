/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

/**
 * A utility to ensure the given value is an Iterator<string>.
 *
 * Where an Array is given its value are filtered to be Unique and Truthy.
 *
 * @throws TypeError where not Array or Iterator
 * @param {Array|Iterator} candidate The value to consider
 * @returns {Iterator<string>} An iterator of string values
 */
function sanitiseIterable(candidate) {
  if (Array.isArray(candidate)) {
    return candidate.filter(isString).filter(isUnique)[Symbol.iterator]();
  } else if (candidate && (typeof candidate === 'object') && candidate[Symbol.iterator]) {
    return candidate;
  } else {
    throw new TypeError('Error in "join" function. Expected Array<string>|Iterable<string>');
  }

  function isString(v) {
    return (typeof v === 'string');
  }

  function isUnique(v, i, a) {
    return a.indexOf(v) === i;
  }
}

module.exports = sanitiseIterable;
