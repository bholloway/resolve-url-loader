'use strict';

const {join, basename} = require('path');
const {promisify} = require('es6-promisify');
const mkdirp = require('mkdirp');
const compose = require('compose-function');
const {assign} = Object;

const joi = require('../lib/joi');
const {safeRemoveDirSync} = require('../lib/fs');
const {lens, doFirst, doLast, sequence, constant} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');

const NAME = basename(__filename).slice(0, -3);

exports.schema = {
  debug: joi.debug().optional(),
  keep: joi.bool().optional()
};

/**
 * Given an optional subdirectory, create a factory for a layer in which a sequence of operations can be isolated.
 *
 * @param {string} [directory] Single subdirectory to nest the root of this layer
 * @return {function(...Function):function(*):Promise} A sequence monad
 */
exports.create = (directory) => {
  joi.assert(
    directory,
    joi.path().relative().optional(),
    'optional sub-directory of the root'
  );

  return compose(
    operation(NAME),
    compose(doFirst, lens('layer', 'layer'), sequence)(
      assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
      ((layer, {keep}) => {
        const {root: base, index: lastIndex, cwd: lastCwd} = layer;
        const index = lastIndex + 1;
        const listToUndo = [];
        const root = directory ? join(base, directory) : base;
        const cwd = directory ? undefined : lastCwd;

        const register = (undo) =>
          listToUndo.push(undo);

        const unlayer = () =>
          sequence(
            ...(keep ? [] : listToUndo.splice(0, listToUndo.length)),
            () => !keep && directory && safeRemoveDirSync(base, directory),
            constant(layer)
          )();

        return assign({}, layer, {index, root, cwd, register, unlayer});
      }),
      lens('*', null)(({index, root}, _, log) => log(
        `layer ${index}`,
        `mkdirp: "${root}"
      `)),
      lens('root', null)((root) => promisify(mkdirp)(root))
    ),
    compose(doLast, lens('layer', 'layer'))(
      ({unlayer}) => unlayer()
    ),
    sequence
  );
};
