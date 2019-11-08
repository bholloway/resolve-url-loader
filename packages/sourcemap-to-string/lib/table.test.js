/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {basename} = require('path');

const tape = require('blue-tape');

require('string.prototype.padend').shim();

const sut = require('./table');

const truncate = (v, w) => v.slice(0, w).padEnd(w, ' ');

tape(
  basename(require.resolve('./table')),
  ({end, equal}) => {

    equal(
      JSON.stringify(sut({
        width: 25,
        indent: 2,
        gap: 1,
        pattern: [0, 1, 0],
        formatCell: truncate
      })([
        ['foo', 'The quick brown fox', 'jumped over'],
        [],
        ['the', '', 'lazy dog'],
      ])),
      JSON.stringify('  foo The qui jumped over\n  \n  the         lazy dog   ')
    );

    end();
  }
);
