/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {join} = require('path');

const compose = require('compose-function');

const assert = require('../lib/assert');
const simpleName = require('../lib/simple-name');
const {parse: parseFile, as: asReadableFile} = require('./extant-file');
const {parse: parseDirectory, as: asDirectory} = require('./extant-directory');

module.exports = (objPath) => ({
  name: [simpleName(__filename), objPath].join('-'),
  parse: (v, {_instance}) => {
    const maybeFile = asReadableFile(_instance[objPath]);
    const maybeBase = asDirectory(maybeFile && parseDirectory(maybeFile.dirname));
    return (typeof v === 'string') && maybeBase && parseFile(join(maybeBase.path, v)) || null;
  },
  as: asReadableFile,
  validate: compose(
    assert(`path relative to ${objPath} file`),
    asReadableFile
  )
});
