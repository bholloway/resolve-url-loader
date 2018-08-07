'use strict';

const compose = require('compose-function');

const joi = require('./joi');
const {lens, sequence} = require('./promise');
const {assertSchema, assertContext} = require('./assert');
const {config} = require('./assert/config');
const {logger, indent} = require('../lib/string');

exports.assertInOperation = assertSchema(joi.any(), config, joi.func());

/**
 * A factory for a higher-order-function that perform checks and logging associated with the base
 * function being an operation.
 *
 * The base function is passed three arguments:
 * - the full context
 * - the config associated with the given `label` already extracted from the context.
 * - a `console.log()` like function
 *
 * @param {string} namespace The label to apply when logging
 * @param {...string} [labels] Optional extended label
 * @returns {function(next:function):function(*):Promise} A sequence enclosing the next function
 */
exports.operation = (namespace, ...labels) => {
  const invocation = labels.length ? `${namespace}() for "${labels.join('.')}"` : `${namespace}()`;
  const label = [namespace, ...labels].join(': ');

  return (next) => compose(lens(['*', `config.${namespace}`], '*'), sequence)(
    assertContext(`${invocation} needs a preceding init or is otherwise without context`),
    assertSchema(joi.any(), config)(`misuse: expected configuration for ${invocation}`),
    (context, config) => {
      const {debug, onActivity} = config;
      const log = logger(debug);
      const indented = compose(log, indent(2));

      onActivity();
      log(`${label}: start`);

      return Promise.resolve(next(context, config, indented))
        .then((vv) => {
          log(`${label}: success`);
          return vv;
        })
        .catch((e) => {
          log(`${label}: failure`);
          throw e;
        });
    }
  );
};
