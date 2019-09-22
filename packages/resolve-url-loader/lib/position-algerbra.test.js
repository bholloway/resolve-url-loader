/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {basename} = require('path');
const tape = require('blue-tape');

const {sanitise, strToOffset, add} = require('./position-algerbra');

const json = (strings, ...substitutions) =>
  String.raw(
    strings,
    ...substitutions.map(v => JSON.stringify(v, (_, vv) => Number.isNaN(vv) ? 'NaN' : vv))
  );

tape(
  basename(require.resolve('./position-algerbra')),
  ({name, test, end: end1, equal}) => {
    test(`${name} / sanitise()`, ({ end: end2 }) => {
      [
        [undefined, {line: NaN, column: NaN}],
        [null, {line: NaN, column: NaN}],
        [false, {line: NaN, column: NaN}],
        [true, {line: NaN, column: NaN}],
        [12, {line: NaN, column: NaN}],
        [{}, {line: NaN, column: NaN}],
        [{line: 1}, {line: 1, column: NaN}],
        [{column: 1}, {line: NaN, column: 1}],
      ].forEach(([input, expected]) =>
        equal(
          json`${sanitise(input)}`,
          json`${expected}`,
          json`input ${input} should sanitise to ${expected}`
        )
      );

      end2();
    });

    test(`${name} / strToOffset()`, ({ end: end2 }) => {
      [
        ['', {line: 0, column: 0}],
        ['something', {line: 0, column: 9}],
        ['another\nthing', {line: 1, column: 5}],
        ['a\r\nthird\nthingie', {line: 2, column: 7}],
        ['a\r\nthird\rthingie', {line: 1, column: 13}],
      ].forEach(([input, expected]) =>
        equal(
          json`${strToOffset(input)}`,
          json`${expected}`,
          json`input ${input} should convert to ${expected}`
        )
      );

      end2();
    });

    test(`${name} / add()`, ({ end: end2 }) => {
      [
        [[{line: 0, column: 2}, {line: 0, column: 3}], {line: 0, column: 5}],
        [[{line: 0, column: 2}, {line: 1, column: 3}], {line: 1, column: 3}],
        [[{line: 1, column: 2}, {line: 0, column: 3}], {line: 1, column: 5}],
        [[{line: 1, column: 2}, {line: 2, column: 3}], {line: 3, column: 3}],
        [[{line: NaN, column: NaN}, {line: 0, column: 3}], {line: NaN, column: NaN}],
        [[{line: NaN, column: NaN}, {line: 2, column: 3}], {line: NaN, column: 3}]
      ].forEach(([input, expected]) =>
        equal(
          json`${add(input)}`,
          json`${expected}`,
          json`input ${input} should add to give ${expected}`
        )
      );

      end2();
    });

    end1();
  }
);
