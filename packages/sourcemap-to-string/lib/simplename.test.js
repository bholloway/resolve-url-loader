/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {basename} = require('path');

const tape = require('blue-tape');

const sut = require('./simple-name');

tape(
  basename(require.resolve('./simple-name')),
  ({end, equal}) => {
    equal(
      sut('foo/bar/baz.blit.js'),
      'baz.blit',
      'should match'
    );

    end();
  }
);
