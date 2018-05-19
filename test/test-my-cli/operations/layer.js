'use strict';

const {basename} = require('path');
const {promisify} = require('es6-promisify');
const mkdirp = require('mkdirp');
const compose = require('compose-function');
const {assign} = Object;

const joi = require('../lib/joi');
const {assertOutLayer} = require('../lib/assert');
const {lens, doFirst, doLast, sequence} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');

const NAME = basename(__filename).slice(0, -3);

const createLayer = () => ({
  undo: () => Promise.resolve(),
  isSealed: false
});

const sealLayer = (layer) => assign({}, layer, {
  isSealed: true
});

exports.schema = {
  debug: joi.debug().optional()
};

/**
 * Opens a new layer.
 *
 * Certain operations may only be performed inside an open layer.
 *
 * @param {...function} [fns] Functions of context
 * @type {function(...function):Promise} A sequence monad
 */
exports.create = compose(
  operation(NAME),
  compose(doFirst, lens('layers', 'layers'), sequence)(
    assertOutLayer(`${NAME}() cannot be called within another ${NAME}()`),
    assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
    (layers) => ([createLayer(), ...layers]),
    lens()((_, {root}, log) => {
      log(`mkdirp: "${root}"`);
      return promisify(mkdirp)(root);
    })
  ),
  doLast(
    lens('layers', 'layers')(([layer, ...layers]) => ([sealLayer(layer), ...layers]))
  ),
  sequence
);
