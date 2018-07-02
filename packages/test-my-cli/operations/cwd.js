'use strict';

const {basename} = require('path');
const compose = require('compose-function');

const joi = require('../lib/joi');
const {assertInLayer} = require('../lib/assert');
const {lens, sequence, constant} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');

const NAME = basename(__filename).slice(0, -3);

exports.schema = {
  debug: joi.debug().optional()
};

/**
 * Present the given a directory as the working directory within this layer.
 *
 * @param {string} directory A working directory
 * @return {function(object):Promise} A pure async function of the test context
 */
exports.create = (directory) => {
  joi.assert(
    directory,
    joi.path().relative().required(),
    'relative directory'
  );

  return compose(operation(NAME), lens('layer', 'layer'), sequence)(
    assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
    assertInLayer(`${NAME}() must be used within layer()`),
    compose(lens(null, 'cwd'), constant)(directory),
    lens('*', null)(({index, cwd}, _, log) => log(
      `layer ${index}`,
      `cwd: "${cwd}"`
    ))
  );
};
