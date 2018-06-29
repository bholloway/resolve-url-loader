'use strict';

const {basename, join, dirname} = require('path');
const compose = require('compose-function');
const {keys, values, entries, assign} = Object;

const joi = require('../lib/joi');
const {lens, sequence, mapSerial, mapParallel} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');
const {assertInLayer} = require('../lib/assert');
const {testIsFile, testIsDir, MkDirOp, CleanOp, SymLinkOp, CopyOp, WriteOp} = require('../lib/fs');

const NAME = basename(__filename).slice(0, -3);

const mergeUndos = ([layer, ...layers]) => (undos) => {
  const {undo} = layer;
  return [
    assign({}, layer, {undo: sequence(...undos, undo)}),
    ...layers
  ];
};

const hashToSrcDestTuple = (hash) => (_, context) =>
  entries(hash).map(([k, v]) => {
    const {root} = context;
    return [
      (typeof v === 'function') ? v(context) : v,
      join(root, k)
    ];
  });

const srcDestTupleToOp = ([srcPath, destPath], {root}, log) => {
  switch (true) {
    case (srcPath === null):
      return (destPath === root) ?
        [] :
        [new MkDirOp({path: destPath, log}), new CleanOp({path: destPath, log})];

    case (typeof srcPath === 'string'):
      if (destPath.startsWith(root)) {
        return Promise
          .all([testIsFile(srcPath).catch(() => console.error(srcPath)), testIsDir(srcPath)])
          .then(([isSrcFile, isSrcDir]) =>
            isSrcDir ? new SymLinkOp({srcPath, destPath, log}) :
              isSrcFile ? new CopyOp({srcPath, destPath, log}) :
                new WriteOp({content: srcPath, destPath, log})
          )
          .then((op) => {
            const destDir = dirname(destPath);
            return (destDir === root) ?
              op :
              [new MkDirOp({path: destDir, log}), op];
          });
      }
      throw new Error(`Given path is outside the root: "${destPath}"`);

    default:
      throw new Error(`Expected key to be null|string, saw ${typeof srcPath}`);
  }
};

const flatten = (array) =>
  array.reduce((r, element) => r.concat(element), []);

const reverse = (array) =>
  [...array].reverse();

exports.schema = {
  debug: joi.debug().optional()
};

/**
 * Given a hash of keys will create directories and files that can be rolled back when the layer
 * is unlayered.
 *
 * All keys are a path to a file or directory.
 *
 * - A value of `null` implies the key is a path that should be created and cleaned.
 * - A value that is an existing file implies the key should be a copy of that file.
 * - A value that is an existing directory implies the key should be a symlink to that directory.
 * - Any other `string` is direct file content and to be found in the file which is the key.
 *
 * @param {object} hash A hash of file system items
 * @return {function(Array):Array} A pure function of layers
 */
exports.create = (hash) => {
  joi.assert(
    keys(hash),
    joi.array().items(
      joi.path().relative().required()
    ).required(),
    'single hash where keys are file or directory paths'
  );
  joi.assert(
    values(hash),
    joi.array().items(
      joi.alternatives().try(
        joi.any().only(null),
        joi.func(),
        joi.string()
      ).required()
    ).required(),
    'single hash where values are null|existing-file-path|existing-directory-path|file-content'
  );

  return compose(operation(NAME), lens('layers', 'layers'), sequence)(
    assertInLayer(`${NAME}() may only be used inside layer()`),
    assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
    compose(lens(null, mergeUndos), sequence)(
      hashToSrcDestTuple(hash),
      lens('*')((list, _, log) => log(`${list.length} tuples`)),
      mapParallel(srcDestTupleToOp),
      flatten,
      lens('*')((list, _, log) => log(`${list.length} operations`)),
      mapSerial((op) => op.exec()),
      reverse,
      mapSerial((op) => () => op.undo())
    )
  );
};
