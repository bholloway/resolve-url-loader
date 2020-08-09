/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

exports.repeatArray = (length, value = undefined) =>
  (new Array(length)).fill(value);

exports.aperture = (n) => (array) => {
  const length = Math.max(0, array.length - n + 1);
  return (new Array(length))
    .fill()
    .map((_, i) => array.slice(i, i + n));
};

exports.mapList = (fn) => (list) =>
  list.map(fn);

exports.first = (list) =>
  list[0];

exports.last = (list) =>
  list[list.length - 1];
