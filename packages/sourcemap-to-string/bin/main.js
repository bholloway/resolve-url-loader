/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {existsSync, readFile} = require('fs');
const {join, resolve} = require('path');

const sequence = require('promise-compose');
const convert = require('convert-source-map');

require('object.entries').shim();
require('util.promisify').shim();
const {promisify} = require('util');

const toString = require('..');
const readStream = require('../lib/read-stream');
const {parse: parseDirectory} = require('../config/extant-directory');

const lensTo = (field) => (fn) => (context) =>
  Promise.resolve(context)
    .then(fn)
    .then(v => Object.assign({}, context, field ? {[field]: v} : v));

module.exports = sequence(
  lensTo('content')(({read}) =>
    readStream(read.stream)
  ),
  lensTo('mapBase')(({read, sourceRootOverride}) =>
    read && read.isFile && read.dirname ||
    sourceRootOverride && sourceRootOverride.isDirectory && sourceRootOverride.dirname ||
    process.cwd()
  ),
  lensTo()(({content, mapBase}) => {
    const instance = convert.fromMapFileSource(content, mapBase);
    if (!instance) {
      throw new Error(`cannot resolve source-map from base ${mapBase}`);
    }
    return instance.toObject();
  }),
  lensTo('sourcesContent')(({read, sourceRootOverride, sources, sourceRoot}) => {
    const sourceRootAbsolute = parseDirectory(sourceRoot);
    const actualRoot = [
      sourceRootOverride && sourceRootOverride.isDirectory && sourceRootOverride.path,
      sourceRootAbsolute && sourceRootAbsolute.isDirectory && sourceRootAbsolute.path,
      read && read.isFile && read.dirname,
      sourceRootOverride && sourceRoot && join(sourceRootOverride.path, sourceRoot),
      read && sourceRoot && join(read.dirname, sourceRoot)
    ]
      .filter(Boolean)
      .map(v => resolve(v))
      .find(base => sources.map(v => join(base, v)).every(v => existsSync(v)));

    if (!actualRoot) {
      throw new Error('viable sourceRoot not found');
    }

    return Promise.all(
      sources.map((v) => join(actualRoot, v)).map((v) => promisify(readFile)(v, 'utf8'))
    );
  }),
  lensTo('result')(toString),
  lensTo()(({ result, write }) => write.stream.write(result)),
  ({ read, write }) => {
    read.isFile && read.stream.destroy();
    write.isFile && write.stream.destroy();
  }
);

