/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {repeatArray, first, last} = require('./array');

const isStringifyable = v =>
  (v !== null) && !isNaN(v) || (typeof v === 'string');

module.exports = ({width, pattern, gap = 1}) => {
  const constraints = [].concat(width);
  const minWidth = first(constraints);
  const maxWidth = last(constraints);

  return (rows) => {
    const widths = rows
      .reduce(
        (maximums, row) => pattern
          .map((_, i) => Array.isArray(row) && (i in row) && isStringifyable(row[i])  ? String(row[i]) : '')
          .map((v, i) => Math.max(maximums[i], v.length)),
        repeatArray(pattern.length, 0)
      );

    const gaps = (widths.length - 1) * gap;
    const naturalWidth = widths
      .reduce((r, v) => r + v, gaps);

    const targetWidth = Math.max(minWidth, Math.min(maxWidth, naturalWidth));

    if (naturalWidth === targetWidth) {
      return widths;
    } else {
      const patternSum = pattern
        .reduce((r, v) => r + v, 0);

      const remainder = widths
        .reduce(
          (r, v, i) => pattern[i] > 0 ? r : (r - v),
          targetWidth - gaps
        );

      return widths
        .map((v, i) => pattern[i] ? Math.floor(pattern[i] * remainder / patternSum) : v);
    }
  };
};
