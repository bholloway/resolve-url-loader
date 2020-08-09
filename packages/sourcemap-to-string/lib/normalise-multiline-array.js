/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {repeatArray} = require('./array');

require('string.prototype.padend').shim();

module.exports = (padding) => {
  const paddingFn = (typeof padding === 'function') ?
    padding :
    () => String(padding);

  return (row) => {
    const rowWithArrayElements = row
      .map(v => [].concat(v));

    const maxLines = rowWithArrayElements
      .reduce((r, v) => Math.max(r, v.length), 1);

    const rowAsPadding = rowWithArrayElements
      .map(([first]) => (typeof first === 'string') ? first.length : 0)
      .map((length, col) => ''.padEnd(length, paddingFn(col)));

    return repeatArray(maxLines)
      .map((_, lineIndex) => rowWithArrayElements
        .map((v, i) => (lineIndex in v) ? v[lineIndex] : rowAsPadding[i])
      );
  };
};
