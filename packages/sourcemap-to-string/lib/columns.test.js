/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
/* jshint bitwise:false */
'use strict';

const {basename} = require('path');

const tape = require('blue-tape');

const {repeatArray} = require('./array');
const sut = require('./columns');

tape(
  basename(require.resolve('./columns')),
  ({test, end: end1, deepEqual}) => {
    test('with default gap', ({end: end2}) => {
      deepEqual(
        sut({width: 40, pattern: [0, 0, 0, 0, 0, 0]})([
          [undefined, null, NaN, '', 12, 'foo']
        ]),
        [0, 0, 0, 0, 2, 3],
        `should measure unstringifyable values as zero width`
      );

      deepEqual(
        repeatArray(8)
          .map((_, i) => [(i & 4) >> 2, (i & 2) >> 1, (i & 1)])
          .map((pattern) =>
            sut({width: [30, 40], pattern})([
              ['ab', 'the quick brown', 'xyz'],
              [],
              ['abc', 'fox jumped over the lazy dog', 'xy'],
            ])
          ),
        repeatArray(8, [3, 28, 3]),
        `should not exceed width of content where given min width allows`
      );

      deepEqual(
        sut({width: 20, pattern: [0, 0, 0]})([
          ['ab', 'the quick brown', 'xyz'],
          [],
          ['abc', 'fox jumped over the lazy dog', 'xy'],
        ]),
        [3, 28, 3],
        'should not constrain content with zero pattern regardless of min width'
      );

      deepEqual(
        sut({width: 20, pattern: [1, 1, 1]})([
          ['ab', 'the quick brown', 'xyz'],
          [],
          ['abc', 'fox jumped over the lazy dog', 'xy'],
        ]),
        [6, 6, 6],
        'should layout content with proportional pattern where min width is insufficient'
      );

      deepEqual(
        sut({width: 80, pattern: [1, 0, 1]})([
          ['ab', 'the quick brown', 'xyz'],
          [],
          ['abc', 'fox jumped', 'xy'],
        ]),
        [31, 15, 31],
        'should layout content with symmetric proportional pattern'
      );

      deepEqual(
        sut({width: 80, pattern: [1, 0, 5]})([
          ['ab', 'the quick brown', 'xyz'],
          [],
          ['abc', 'fox jumped', 'xy'],
        ]),
        [10, 15, 52],
        'should layout content with asymmetic proportional pattern'
      );

      end2();
    });

    test('with explicit wide gap', ({end: end2}) => {
      deepEqual(
        repeatArray(8)
          .map((_, i) => [(i & 4) >> 2, (i & 2) >> 1, (i & 1)])
          .map((pattern) =>
            sut({width: [30, 40], pattern: pattern, gap: 3})([
              ['ab', 'the quick brown', 'xyz'],
              [],
              ['abc', 'fox jumped over the lazy dog', 'xy'],
            ])
          ),
        repeatArray(8, [3, 28, 3]),
        `should not exceed width of content where given min width allows`
      );

      deepEqual(
        sut({width: 20, pattern: [0, 0, 0], gap: 3})([
          ['ab', 'the quick brown', 'xyz'],
          [],
          ['abc', 'fox jumped over the lazy dog', 'xy'],
        ]),
        [3, 28, 3],
        'should not constrain content with zero pattern regardless of min width'
      );

      deepEqual(
        sut({width: 20, pattern: [1, 1, 1], gap: 3})([
          ['ab', 'the quick brown', 'xyz'],
          [],
          ['abc', 'fox jumped over the lazy dog', 'xy'],
        ]),
        [4, 4, 4],
        'should layout content with proportional pattern where min width is insufficient'
      );

      deepEqual(
        sut({width: 80, pattern: [1, 0, 1], gap: 3})([
          ['ab', 'the quick brown', 'xyz'],
          [],
          ['abc', 'fox jumped', 'xy'],
        ]),
        [29, 15, 29],
        'should layout content with symmetric proportional pattern'
      );

      deepEqual(
        sut({width: 80, pattern: [1, 0, 5], gap: 3})([
          ['ab', 'the quick brown', 'xyz'],
          [],
          ['abc', 'fox jumped', 'xy'],
        ]),
        [9, 15, 49],
        'should layout content with asymmetic proportional pattern'
      );

      end2();
    });

    end1();
  }
);
