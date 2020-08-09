/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {basename} = require('path');

const tape = require('blue-tape');

const sut = require('./normalise-multiline-array');

tape(
  basename(require.resolve('./normalise-multiline-array')),
  ({end, deepEqual}) => {
    deepEqual(
      sut(' ')(['foo', ['bar'], ['baz', 'blit']]),
      [['foo', 'bar', 'baz'], ['   ', '   ', 'blit']],
      'should use string padding for all columns'
    );

    deepEqual(
      sut((i) => i)(['foo', ['bar'], ['baz', 'blit']]),
      [['foo', 'bar', 'baz'], ['000', '111', 'blit']],
      'should differentiate padding by column'
    );

    end();
  }
);
