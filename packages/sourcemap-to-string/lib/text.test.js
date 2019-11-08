/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {basename} = require('path');

const tape = require('blue-tape');

const {formatInt, formatSourceText, formatMultilineText} = require('./text');

tape(
  basename(require.resolve('./text')),
  ({name, test, end: end1, equal, deepEqual}) => {
    test(`${name} / formatSourceText()`, ({ end: end2 }) => {
      deepEqual(
        formatSourceText(5, 'foo', 15),
        ['░░░░foo░░░░░░░░'],
        'should match expected single word format'
      );

      deepEqual(
        formatSourceText(5, 'foo\nbar\nbaz', 15),
        [
          '░░░░foo⏎       ',
          'bar⏎           ',
          'baz░░░░░░░░░░░░'
        ],
        'should match expected word-per-line format'
      );

      deepEqual(
        formatSourceText(5, 'The quick brown fox\njumped over the\nlazy dog', 15),
        [
          '░░░░The quick b',
          'rown fox⏎      ',
          'jumped over the',
          '⏎              ',
          'lazy dog░░░░░░░'
        ],
        'should match expected multi-word mult-line format'
      );

      end2();
    });

    test(`${name} / formatMultilineText()`, ({ end: end2 }) => {
      deepEqual(
        formatMultilineText('The quick brown fox\njumped over the\nlazy dog', 15),
        [
          'The quick brown',
          'fox            ',
          'jumped over the',
          'lazy dog       '
        ],
        'should match break exactly where words allow'
      );

      deepEqual(
        formatMultilineText('The quick brown fox\njumped over the\nlazy dog', 17),
        [
          'The quick brown  ',
          'fox              ',
          'jumped over the  ',
          'lazy dog         '
        ],
        'should pad end where words don`t allow exact break'
      );

      end2();
    });

    test(`${name} / formatInt()`, ({ end: end2 }) => {
      equal(
        formatInt(null, 4),
        '    ',
        'should return whitespace for non-coerceable non-numbers'
      );

      equal(
        formatInt('12', 4),
        '    ',
        'should return whitespace for coerceable non-numbers'
      );

      equal(
        formatInt(NaN, 4),
        '    ',
        'should return whitespace for NaN'
      );

      equal(
        formatInt(12, 4),
        '0012',
        'should return zero padding for numbers'
      );

      end2();
    });

    end1();
  }
);
