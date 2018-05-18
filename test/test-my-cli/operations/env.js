'use strict';

const {basename} = require('path');
const compose = require('compose-function');
const {assign} = Object;

const joi = require('../lib/joi');
const {lens, sequence} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');
const {assertInLayer} = require('../lib/assert');
const {env} = require('../lib/assert/env');

const NAME = basename(__filename).slice(0, -3);

const system = process.env;

const createMerge = (append) => {
  const defaultDelimiter = (process.platform === 'win32') ? ';' : ':';

  const delimiters = (Array.isArray(append) ? append : Object.keys(append))
    .reduce((r, k) => assign(r, {
      [k]: (typeof append[k] === 'string') ? append[k] : defaultDelimiter
    }), {});

  return (k, current, previous) => {
    switch (true) {
      case (k in current) && (delimiters[k]) && (k in previous):
        return `${current[k]}${delimiters[k]}${previous[k]}`;

      case (k in current) && (delimiters[k]) && (k in system):
        return `${current[k]}${delimiters[k]}${system[k]}`;

      case (k in current):
        return current[k];

      case (k in previous):
        return previous[k];

      default:
        throw new Error('Reached an illegal state');
    }
  };
};

exports.schema = {
  debug: joi.debug().optional(),
  append: joi.alternatives().try(
    joi.array().items(joi.string().required()),
    joi.object().pattern(/^[\w-]+$/, joi.alternatives().try(joi.bool(), joi.string()).required())
  ).optional()
};

/**
 * Given a hash of new ENV the method will merge this with ENV declared previously in this layer
 * or previous layers.
 *
 * @param {object} hash A hash of ENV values
 * @return {function(Array):Array} A pure function of layers
 */
exports.create = (hash) => {
  joi.assert(hash, env.required(), 'single hash of ENV:value');

  return compose(operation(NAME), lens('layers', 'layers'), sequence)(
    assertInLayer(`${NAME}() may only be used inside layer()`),
    assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
    (layers, {append}, log) => {

      // we need to refer to the last env() in this layer, or failing that, previous layers
      const i = layers.findIndex(({env}) => !!env);
      const {env: previousGetter = () => ({})} = (i < 0) ? {} : layers[i];
      const previousLayerN = (i < 0) ? 0 : layers.length - i;

      // merge the current hash with previous values
      return Promise.resolve()
        .then(previousGetter)
        .then((previousHash) => {
          // merge the given hash with the previous one
          // we can calculate now since ENV is invariant
          const merge = createMerge(append);
          const result = [...Object.keys(hash), ...Object.keys(previousHash)]
            .filter((v, i, a) => (a.indexOf(v) === i))
            .reduce((r, k) => assign(r, {[k]: merge(k, hash, previousHash)}), {});

          // remember that layers are backwards with most recent first
          log(
            [`layer ${layers.length}`, previousLayerN && `layer ${previousLayerN}`]
              .filter(Boolean).join(' -> '),
            JSON.stringify(hash),
            JSON.stringify(result)
          );

          const [layer, ...rest] = layers;
          return [assign({}, layer, {env: () => result}), ...rest];
        });
    }
  );
};
