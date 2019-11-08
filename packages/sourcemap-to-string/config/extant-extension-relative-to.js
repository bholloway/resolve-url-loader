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

module.exports = (objPath) => ({
  name: [simpleName(__filename), objPath].join('-'),
  parse: (v, {_instance}) => {
    const maybeFile = asReadableFile(_instance[objPath]);
    return (typeof v === 'string') && maybeFile && parseFile(join(maybeFile.path + v)) || null;
  },
  as: asReadableFile,
  validate: compose(
    assert(`extension relative to ${objPath} file`),
    asReadableFile
  )
});
