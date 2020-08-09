/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {stdin} = require('process');

const compose = require('compose-function');

const assert = require('../lib/assert');
const as = require('../lib/as');
const simpleName = require('../lib/simple-name');
const {isVinyl, Vinyl} = require('../lib/vinyl');

const asReadableStream = as(isVinyl, v => v.isReadable);

module.exports = {
  name: simpleName(__filename),
  parse: v => (v === 'stdin') ? (new Vinyl('/dev/stdin', stdin)) : null,
  as: asReadableStream,
  validate: compose(
    assert('stdin'),
    asReadableStream
  ),
  default: 'stdin'
};
