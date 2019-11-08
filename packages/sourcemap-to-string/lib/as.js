/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

module.exports = (...predicates) => (value) =>
  predicates.every(predicate => predicate(value)) ? value : null;
