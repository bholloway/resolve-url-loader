'use strict';

const {basename} = require('path');
const compose = require('compose-function');
const {isMatch} = require('micromatch');
const {assign, keys} = Object;

const joi = require('../lib/joi');
const {assertInLayer} = require('../lib/assert');
const {lens, sequence} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');
const {env} = require('../lib/assert/env');

const NAME = basename(__filename).slice(0, -3);

const createMerge = ({merge, base}) => (key, previous, current) => {
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

const createInvoke = (layer) => (candidate) =>
  (typeof candidate === 'function') ? candidate(layer) : candidate;

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
 * @return {function(object):Promise} A pure async function of the test context
 */
exports.create = (hash) => {
  joi.assert(hash, env.required(), 'single hash of ENV:value');

  return compose(operation(NAME), lens('layer', 'layer.env'), sequence)(
    assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
    assertInLayer(`${NAME}() must be used within layer()`),
    (layer, {merge}, log) => {
      const {index, env: prevEnv = {}} = layer;
      const mergeValue = compose(stringify, createMerge({merge, base: process.env}));

      // evaluate the current values
      const invoke = createInvoke(layer);
      const additionalEnv = keys(hash).reduce((r, k) => assign(r, {[k]: invoke(hash[k])}), {});

      // merge the current hash with previous values
      const nextEnv = [...keys(prevEnv), ...keys(additionalEnv)]
        .filter((v, i, a) => (a.indexOf(v) === i))
        .reduce((r, k) => assign(r, {[k]: mergeValue(k, prevEnv, additionalEnv)}), {});

      log(
        `layer ${index}`,
        JSON.stringify(additionalEnv),
        JSON.stringify(nextEnv)
      );

      return nextEnv;
    }
  );
};
