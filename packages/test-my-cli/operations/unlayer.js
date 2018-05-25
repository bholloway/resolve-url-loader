'use strict';

const {basename} = require('path');
const compose = require('compose-function');

const joi = require('../lib/joi');
const {assertOutLayer} = require('../lib/assert');
const {lens, sequence, constant} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');

const NAME = basename(__filename).slice(0, -3);

exports.schema = {
  debug: joi.debug().optional(),
  inhibit: joi.bool().optional()
};

/**
 * Remove the topmost layer and undo its mutable effects.
 *
 * @type {function():Promise} A promise factory
 */
exports.create = compose(operation(NAME), lens('layers', 'layers'), sequence)(
  assertOutLayer(`${NAME}() cannot be called within another layer()`),
  assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
  ([{undo}, ...layers], {inhibit}) => inhibit ? layers : undo().then(constant(layers))
);
