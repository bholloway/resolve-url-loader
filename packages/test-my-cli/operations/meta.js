'use strict';

const {basename} = require('path');
const compose = require('compose-function');
const {assign, keys} = Object;

const joi = require('../lib/joi');
const {lens, sequence} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');
const {assertInLayer} = require('../lib/assert');
const {meta} = require('../lib/assert/meta');

const NAME = basename(__filename).slice(0, -3);

const createInvoke = (context) => (candidate) =>
  (typeof candidate === 'function') ? candidate(context) : candidate;

exports.schema = {
  debug: joi.debug().optional()
};

/**
 * Given a hash of new meta the method will merge this with meta declared previously in this layer
 * or previous layers.
 *
 * @param {object} hash A hash of meta values
 * @return {function(Array):Array} A pure function of layers
 */
exports.create = (hash) => {
  joi.assert(hash, meta.required(), 'single hash of key:value');

  return compose(operation(NAME), lens('layers', 'layers'), sequence)(
    assertInLayer(`${NAME}() may only be used inside layer()`),
    assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
    (layers, {root}, log) => {
      const invoke = createInvoke({root});
      const currentHash = keys(hash)
        .reduce((r, k) => assign(r, {[k]: invoke(hash[k])}), {});

      // we need to refer to the last meta() in this layer, or failing that, previous layers
      // doing this by index is less terse but we want that information for debug
      const i = layers.findIndex(({meta}) => !!meta);
      const previousLayerN = (i < 0) ? 0 : layers.length - i;
      const {meta: previousGetter = () => ({})} = (i < 0) ? {} : layers[i];

      // merge the current hash with previous values
      return Promise.resolve()
        .then(previousGetter)
        .then((previousHash) => {
          // merge the given hash with the previous one
          const result = assign(currentHash, previousHash);

          // remember that layers are backwards with most recent first
          log(
            [`layer ${layers.length}`, previousLayerN && `layer ${previousLayerN}`]
              .filter(Boolean).join(' -> '),
            JSON.stringify(hash),
            JSON.stringify(result)
          );

          const [layer, ...rest] = layers;
          return [assign({}, layer, {meta: () => result}), ...rest];
        });
    }
  );
};
