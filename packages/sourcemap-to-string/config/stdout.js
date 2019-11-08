/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {stdout} = require('process');

const compose = require('compose-function');

const assert = require('../lib/assert');
const as = require('../lib/as');
const simpleName = require('../lib/simple-name');
const {isVinyl, Vinyl} = require('../lib/vinyl');

const asWritableStream = as(isVinyl, v => v.isWritable);

module.exports = {
  name: simpleName(__filename),
  parse: v => (v === 'stdout') ? (new Vinyl('/dev/stdout', stdout)) : null,
  as: asWritableStream,
  validate: compose(
    assert('stdout'),
    asWritableStream
  ),
  default: 'stdout'
};
