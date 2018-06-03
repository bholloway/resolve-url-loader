'use strict';

const {basename} = require('path');
const compose = require('compose-function');
const {isMatch} = require('micromatch');
const {assign, keys} = Object;

const joi = require('../lib/joi');
const {lens, sequence} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');
const {assertInLayer} = require('../lib/assert');
const {env} = require('../lib/assert/env');

const NAME = basename(__filename).slice(0, -3);

const createMerge = ({merge, transform, base}) => {
  return (key, previous, current) => {
    const mergeKey = keys(merge).find((pattern) => isMatch(key, pattern));
    const mergeFn = (typeof merge[mergeKey] === 'function') ? merge[mergeKey] : ((_, x) => x);

    switch (true) {
      case (key in previous) && (key in current):
        return mergeFn(previous[key], current[key]);

      case (key in base) && (key in current):
        return mergeFn(base[key], current[key]);

      case (key in current):
        return current[key];

      case (key in previous):
        return previous[key];

      default:
        throw new Error('Reached an illegal state');
    }
  };
};

const createInvoke = (context) => (candidate) =>
  (typeof candidate === 'function') ? candidate(context) : candidate;

const stringify = (candidate) =>
  (typeof candidate === 'string') ? candidate : JSON.stringify(candidate);

exports.schema = {
  debug: joi.debug().optional(),
  merge: joi.object().pattern(/^[\w-*]+$/, joi.func().required()).unknown(false).optional()
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
    (layers, {root, merge}, log) => {
      const mergeValue = compose(stringify, createMerge({merge, base: process.env}));
      const invoke = createInvoke({root});
      const currentHash = keys(hash)
        .reduce((r, k) => assign(r, {[k]: invoke(hash[k])}), {});

      // we need to refer to the last env() in this layer, or failing that, previous layers
      // doing this by index is less terse but we want that information for debug
      const i = layers.findIndex(({env}) => !!env);
      const previousLayerN = (i < 0) ? 0 : layers.length - i;
      const {env: previousGetter = () => ({})} = (i < 0) ? {} : layers[i];

      // merge the current hash with previous values
      return Promise.resolve()
        .then(previousGetter)
        .then((previousHash) => {
          // merge the given hash with the previous one
          const result = [...keys(previousHash), ...keys(currentHash)]
            .filter((v, i, a) => (a.indexOf(v) === i))
            .reduce((r, k) => assign(r, {[k]: mergeValue(k, previousHash, currentHash)}), {});

          // remember that layers are backwards with most recent first
          log(
            [`layer ${layers.length}`, previousLayerN && `layer ${previousLayerN}`]
              .filter(Boolean).join(' -> '),
            JSON.stringify(currentHash),
            JSON.stringify(result)
          );

          const [layer, ...rest] = layers;
          return [assign({}, layer, {env: () => result}), ...rest];
        });
    }
  );
};
