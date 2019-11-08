/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {existsSync, statSync, createReadStream} = require('fs');
const {resolve} = require('path');

const compose = require('compose-function');

const assert = require('../lib/assert');
const as = require('../lib/as');
const simpleName = require('../lib/simple-name');
const {isVinyl, Vinyl} = require('../lib/vinyl');

const isFile = v => existsSync(v) && statSync(v).isFile();

const asReadableFile = as(isVinyl, v => v.isFile, v => v.isReadable);

const create = path =>
  new Vinyl(path, createReadStream(path, { encoding: 'utf8' }));

module.exports = {
  name: simpleName(__filename),
  parse: v => (typeof v === 'string') && isFile(resolve(v)) && create(resolve(v)) || null,
  as: asReadableFile,
  validate: compose(
    assert('absolute or relative path to a file'),
    asReadableFile
  )
};
