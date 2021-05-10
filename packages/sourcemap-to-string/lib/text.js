/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const wordWrap = require('word-wrap');


const {repeatArray, last} = require('./array');

const isStringifyable = v =>
  (v !== null) && !isNaN(v) || (typeof v === 'string');

exports.sanitiseText = (value) =>
  String(value)
    .replace(/[^\x20-\x7E\r\n\t]/g, '�')
    .replace(/\r?\n/g, '\n')
    .replace(/\r/g, '⇦')
    .replace(/\t/g, '⇨');

exports.formatMultilineText = (value, width) =>
  wordWrap(exports.sanitiseText(value || ''), {width})
    .split('\n')
    .map(v => v.trim())
    .map(v => v.padEnd(width));

exports.formatSourceText = (offset, candidate, width) => {
  const text = isStringifyable(candidate) ? exports.sanitiseText(candidate) : '';
  if (text.length === 0) {
    return [ ''.padEnd(width, '░') ];
  } else {
    return text
      .padStart(text.length + (offset - 1) % width, '░')
      .split('\n')
      .map((v, i, a) => (v === last(a)) ? v : (v + '⏎'))
      .flatMap((line) =>
        repeatArray(Math.ceil(line.length / width))
          .map((_, i) => line.slice(i * width, (i + 1) * width))
      )
      .map((v, _, a) => v.padEnd(width, (v === last(a) && !last(a).endsWith('⏎')) ? '░' : ' '));
  }
};

exports.formatInt = (candidate, width) =>
  (typeof candidate !== 'number') || isNaN(candidate) ?
    ''.padStart(width, '-') :
    String(candidate).padStart(width, '0');
