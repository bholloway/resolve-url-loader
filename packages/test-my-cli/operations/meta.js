'use strict';

const {basename} = require('path');
const compose = require('compose-function');
const {assign, keys} = Object;

const joi = require('../lib/joi');
const {assertInLayer} = require('../lib/assert');
const {lens, sequence} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');
const {meta} = require('../lib/assert/meta');

const NAME = basename(__filename).slice(0, -3);

const createInvoke = (context) => (candidate) =>
  (typeof candidate === 'function') ? candidate(context) : candidate;

exports.schema = {
  debug: joi.debug().optional()
};

/**
 * Given a hash of new meta the method will merge this with meta declared previously in this layer
 * completes.
 *
 * @param {object} hash A hash of meta values
 * @return {function(object):Promise} A pure async function of the test context
 */
exports.create = (hash) => {
  joi.assert(hash, meta.required(), 'single hash of key:value');

  return compose(operation(NAME), lens('layer', 'layer.meta'), sequence)(
    assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
    assertInLayer(`${NAME}() must be used within layer()`),
    (context, {root}, log) => {
      const {index, meta} = context;
      const invoke = createInvoke(context);
      const currentHash = keys(hash)
        .reduce((r, k) => assign(r, {[k]: invoke(hash[k])}), {});

      // merge the current hash with previous values
      return Promise.resolve(meta)
        .then((previousHash) => {
          const result = assign(currentHash, previousHash);

          log(
            `layer ${index}`,
            JSON.stringify(currentHash),
            JSON.stringify(result)
          );

          return result;
        });
    }
  );
};
