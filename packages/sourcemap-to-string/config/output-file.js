/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {existsSync, statSync, createWriteStream} = require('fs');
const {resolve, dirname} = require('path');

const compose = require('compose-function');

const assert = require('../lib/assert');
const as = require('../lib/as');
const simpleName = require('../lib/simple-name');
const {isVinyl, Vinyl} = require('../lib/vinyl');

const isDirectory = v => existsSync(v) && statSync(v).isDirectory();

const asWritableFile = as(isVinyl, v => v.isFile, v => v.isWritable);

const create = path =>
  new Vinyl(path, createWriteStream(path, { encoding: 'utf8' }));

module.exports = {
  name: simpleName(__filename),
  parse: v => (typeof v === 'string') && isDirectory(dirname(resolve(v))) && create(resolve(v)) || null,
  as: asWritableFile,
  validate: compose(
    assert('absolute or relative path to a file whose parent directory exists'),
    as(isVinyl, v => v.isWritable)
  )
};
