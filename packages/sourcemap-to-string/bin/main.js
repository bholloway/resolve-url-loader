/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {existsSync, readFile} = require('fs');
const {join, resolve} = require('path');

const sequence = require('promise-compose');
const convert = require('convert-source-map');

require('util.promisify').shim();
const {promisify} = require('util');

const toString = require('..');
const readStream = require('../lib/read-stream');
const {parse: parseDirectory} = require('../config/extant-directory');

const lensTo = (field) => (fn) => (context) =>
  Promise.resolve(context)
    .then(fn)
    .then(v => Object.assign({}, context, field && {[field]: v}));

module.exports = sequence(
  lensTo('content')(({read}) =>
    readStream(read.stream)
  ),
  lensTo('mapBase')(({read, sourceRoot}) =>
    read && read.isFile && read.dirname ||
    sourceRoot && sourceRoot.isDirectory && sourceRoot.dirname ||
    process.cwd()
  ),
  lensTo('sourcemap')(({content, mapBase}) => {
    const instance = convert.fromMapFileSource(content, mapBase);
    if (!instance) {
      throw new Error(`cannot resolve source-map from base ${mapBase}`);
    }
    return instance.toObject();
  }),
  lensTo('mapRoot')(({sourcemap: {sourceRoot}}) => parseDirectory(sourceRoot)),
  lensTo('mappings')(({ sourcemap: { mappings }}) => mappings),
  lensTo('sourcesContent')(({read, sourceRoot, mapRoot, sourcemap: {sources, sourceRoot: relativeRoot}}) => {
    const actualRoot = [
      sourceRoot && sourceRoot.isDirectory && sourceRoot.path,
      mapRoot && mapRoot.isDirectory && mapRoot.path,
      read && read.isFile && read.dirname,
      sourceRoot && relativeRoot && join(sourceRoot.path, relativeRoot),
      read && relativeRoot && join(read.dirname, relativeRoot)
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

