/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {EOL} = require('os');

const wordWrap = require('word-wrap');

require('Array.prototype.flatmap').shim();
require('string.prototype.padstart').shim();
require('string.prototype.padend').shim();

const {repeatArray, last} = require('./array');

exports.formatMultilineText = (value, width) =>
  wordWrap(value || '', {width})
    .split('\n')
    .map(v => v.trim())
    .map(v => v.padEnd(width));

exports.formatSourceText = (offset, text, width) =>
  (''.padEnd((offset - 1) % width, '░') + text)
    .split(EOL)
    .map((v, i, a) => (v === last(a)) ? v : (v + '⏎'))
    .flatMap((line) =>
      repeatArray(Math.ceil(line.length / width))
        .map((_, i) => line.slice(i * width, (i + 1) * width))
    )
    .map((v, _, a) => v.padEnd(width, (v === last(a) && !last(a).endsWith('⏎')) ? '░' : ' '));

exports.formatInt = (candidate, width) =>
  (typeof candidate !== 'number') || isNaN(candidate) ?
    ''.padStart(width, ' ') :
    String(candidate).padStart(width, '0');
