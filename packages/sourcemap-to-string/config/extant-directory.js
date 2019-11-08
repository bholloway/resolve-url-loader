/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {existsSync, statSync} = require('fs');
const {resolve} = require('path');

const compose = require('compose-function');

const assert = require('../lib/assert');
const as = require('../lib/as');
const simpleName = require('../lib/simple-name');
const {isVinyl, Vinyl} = require('../lib/vinyl');

const isDirectory = v => existsSync(v) && statSync(v).isDirectory();

const asDirectory = as(isVinyl, v => v.isDirectory);

const create = path =>
  new Vinyl(path, null);

module.exports = {
  name: simpleName(__filename),
  parse: v => (typeof v === 'string') && isDirectory(resolve(v)) && create(resolve(v)) || null,
  as: asDirectory,
  validate: compose(
    assert('absolute or relative path to a directory'),
    asDirectory
  )
};
