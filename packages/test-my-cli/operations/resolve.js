'use strict';

const {basename} = require('path');
const compose = require('compose-function');

const joi = require('../lib/joi');
const {lens, doFirst, sequence} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');

const NAME = basename(__filename).slice(0, -3);

exports.schema = {
  debug: joi.debug().optional()
};

/**
 * A lens into the resolved layer.
 *
 * @param {string} fn A function of config
 * @returns {function(*):Promise} A sequence monad
 */
exports.create = compose(
  operation(NAME),
  lens('layers', null),
  doFirst(
    assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
    (layers, _, log) => {

      // locate cwd and env (optional)
      const {cwd: cwdGetter} = layers.find(({cwd}) => !!cwd) || {};
      const {env: envGetter} = layers.find(({env}) => !!env) || {};

      // resolve cwd and env
      const cwd = cwdGetter ? cwdGetter() : {};
      const env = envGetter ? envGetter() : {};
      log(
        `layer ${layers.length}`,
        `cwd ${JSON.stringify(cwd)}`,
        `env ${JSON.stringify(env)}`
      );

      return {cwd, env};
    }
  ),
  sequence
);
