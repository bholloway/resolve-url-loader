'use strict';

const {basename, join} = require('path');
const compose = require('compose-function');
const {assign} = Object;

const joi = require('../lib/joi');
const {lens, sequence} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');
const {assertInLayer} = require('../lib/assert');

const NAME = basename(__filename).slice(0, -3);

exports.schema = {
  debug: joi.debug().optional()
};

/**
 * Given a directory the method will present this as the working directory.
 *
 * @param {string} directory A working directory
 * @return {function(Array):Array} A pure function of layers
 */
exports.create = (directory) => {
  joi.assert(
    directory,
    joi.path().relative().required(),
    'single directory'
  );

  return compose(operation(NAME), lens('layers', 'layers'), sequence)(
    assertInLayer(`${NAME}() may only be used inside layer()`),
    assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
    (layers, {root}, log) => {
      const cwd = join(root, directory);
      log(
        `layer ${layers.length}`,
        JSON.stringify(cwd)
      );

      const [layer, ...rest] = layers;
      return [assign({}, layer, {cwd: () => cwd}), ...rest];
    }
  );
};
