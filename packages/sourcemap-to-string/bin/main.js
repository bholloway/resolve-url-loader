/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {existsSync, readFile} = require('fs');
const {join, resolve, normalize} = require('path');
const {promisify} = require('util');

const compose = require('compose-function');
const sequence = require('promise-compose');
const convert = require('convert-source-map');

const toString = require('..');
const readStream = require('../lib/read-stream');
const {parse: parseDirectory} = require('../config/extant-directory');

const lensTo = (field) => (fn) => (context) =>
  Promise.resolve(context)
    .then(fn)
    .then(v => Object.assign({}, context, field ? {[field]: v} : v));

const rebaseTo = (base) => (filename) =>
  compose(normalize, join)(base, filename);

module.exports = sequence(
  lensTo('content')(({read}) =>
    readStream(read.stream)
  ),
  lensTo('mapBase')(({read, sourceRootOverride}) =>
    read && read.isFile && read.dirname ||
    sourceRootOverride && sourceRootOverride.isDirectory && sourceRootOverride.dirname ||
    process.cwd()
  ),
  lensTo()(({content, mapBase, map: { file: mapFile1, ext: mapFile2 }}) => {
    const explicitFile = mapFile1 || mapFile2;
    if (explicitFile) {
      return readStream(explicitFile.stream)
        .then(mapContent => JSON.parse(mapContent))
        .catch(() => {
          throw new Error(`cannot read source-map file ${explicitFile}`);
        });
    } else {
      const instance = convert.fromMapFileSource(content, mapBase);
      if (!instance) {
        throw new Error(`cannot resolve source-map from base ${mapBase}`);
      }
      return instance.toObject();
    }
  }),
  lensTo('sourcesSanitised')(({ sources }) => sources.map(v => v.replace(/\*+$/g, ''))),
  lensTo('sourcesContent')(({read, sourceRootOverride, sourcesSanitised, sourceRoot}) => {
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
      .find(base => sourcesSanitised.map(rebaseTo(base)).every(v => existsSync(v)));

    if (!actualRoot) {
      throw new Error('viable sourceRoot not found');
    }

    return Promise.all(
      sourcesSanitised.map(rebaseTo(actualRoot)).map((v) => promisify(readFile)(v, 'utf8'))
    );
  }),
  lensTo('sources')(({ sanitiseSources, sources, sourcesSanitised }) => sanitiseSources ? sourcesSanitised : sources),
  lensTo('result')(toString),
  lensTo()(({ result, write }) => write.stream.write(result)),
  ({ read, write, map: { file: mapFile1, ext: mapFile2 } }) => {
    [read, write, mapFile1, mapFile2]
      .forEach((stream) => stream && stream.destroy && stream.destroy());
  }
);
