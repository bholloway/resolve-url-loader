/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

require('Array.prototype.flatmap').shim();
require('string.prototype.padend').shim();

const columns = require('./columns');
const normaliseRowHeight = require('./normalise-multiline-array');

module.exports = ({
    width,
    pattern,
    gap = 1,
    indent = 0,
    formatCell = (x => x),
    formatTable = (x => x),
    padding = ' '
}) => {
  const getColumnWidths = columns({
    width: width - indent,
    gap,
    pattern,
  });

  return (rows) => {
    const widths = getColumnWidths(rows);
    return formatTable(rows, widths)
      .map((r) => r.map((v, i) => formatCell(v, widths[i])))
      .flatMap(normaliseRowHeight(padding))
      .map(row => row.join(''.padEnd(gap, ' ')))
      .map(value => ''.padEnd(indent, ' ') + value)
      .join('\n');
  };
};
