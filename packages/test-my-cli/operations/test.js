'use strict';

const {basename} = require('path');
const compose = require('compose-function');
const {assign} = Object;

const joi = require('../lib/joi');
const {lens, sequence} = require('../lib/promise');
const {operation, assertInOperation} = require('../lib/operation');

const NAME = basename(__filename).slice(0, -3);

/**
 * A signature matching Tape tests that will create a test that passes through the context.
 *
 * @param {string} name The name of the test
 * @param {function} fn The test function
 * @return {function(object):Promise} A pure async function of the outer test
 */
exports.create = (name, fn) => {
  joi.assert(
    name,
    joi.string().required(),
    'the test "name"'
  );
  joi.assert(
    fn,
    joi.func().required(),
    'the test implementation function'
  );

  return compose(operation(NAME, name), sequence)(
    assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
    (context0, {onActivity}, log) => {
      const {test: test0} = context0;

      onActivity();

      const innerTestWithOuterContext = (test1) =>
        assign({}, context0, {test: test1});

      const outerTestWithInnerContext = () => (context1) =>
        assign({}, context1, {test: test0});

      // fix race condition with blue-tape ending the test before next test is defined
      const delayTape = sequence(
        () => log(`test: ${name}: waiting to end`),
        () => new Promise(resolve => setTimeout(resolve, 50)),
        () => log(`test: ${name}: actual end`)
      );

      return new Promise((resolve, reject) => test0.test(
        `${test0.name}/${name}`,
        (t) => Promise.resolve(t)
          .then(onActivity)
          .then(lens(innerTestWithOuterContext, outerTestWithInnerContext)(fn))
          .then(resolve)
          .catch(reject)
          .then(delayTape)
        )
      );
    });
};
