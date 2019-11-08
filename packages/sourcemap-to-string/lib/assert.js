/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

module.exports = (message) => (value) => {
  if (value) {
    return value;
  }
  throw new Error(message);
};
