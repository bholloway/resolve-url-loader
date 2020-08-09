/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const compose = require('compose-function');

const assert = require('../lib/assert');
const as = require('../lib/as');
const simpleName = require('../lib/simple-name');

const asNaturalNumber = as(v => typeof v === 'number' && !isNaN(v) && (v > 0) && (Math.round(v) === v));

module.exports = {
  name: simpleName(__filename),
  parse: v => parseFloat(v),
  as: asNaturalNumber,
  validate: compose(
    assert('stdin'),
    asNaturalNumber
  )
};
