'use strict';

const {normalize, join, basename} = require('path');
const spawn = require('cross-spawn');
const compose = require('compose-function');

const joi = require('../lib/joi');
const {assertInLayer} = require('../lib/assert');
const {operation, assertInOperation} = require('../lib/operation');
const {withTime, lens, sequence, constant} = require('../lib/promise');
const {assertSchema} = require('../lib/assert');
const {config} = require('../lib/assert/config');
const {env} = require('../lib/assert/env');

const NAME = basename(__filename).slice(0, -3);

const assertCwdEnv = assertSchema(
  joi.object({
    cwd: joi.path().relative().required(),
    env: env.required()
  }).unknown(true),
  config,
  joi.func()
);

exports.schema = {
  debug: joi.debug().optional()
};

/**
 * Given a command the method will execute in shell and resolve the results, discarding layers.
 *
 * @param {string} command A shell command
 * @return {function(object):Promise} A pure async function of the test context
 */
exports.create = (command) => {
  joi.assert(
    command,
    joi.string().min(2).required(),
    'single shell command'
  );
  const [cmd, ...args] = command.split(' ');

  return compose(operation(NAME), lens('layer', 'exec'), sequence)(
    assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
    assertInLayer(`${NAME}() must be used within layer()`),
    assertCwdEnv(`${NAME}() requires a preceding cwd() and env()`),
    compose(lens(null, 'caller'), constant)(
      // find the shallowest absolute filename in the call stack of the create() not the invocation
      new Error().stack
        .match(/\(((?:\w:)?[\\\/][^)]+)\)/g)
        .pop()
        .slice(1, -1)
    ),
    lens('*', 'cwd')(({root, cwd}) => cwd ? compose(normalize, join)(root, cwd) : root),
    lens('*', null)(({index, caller, cwd, env, meta}, _, log) => log(
      `layer:  ${index}`,
      `caller: ${JSON.stringify(caller)}`,
      `cmd:    ${JSON.stringify(command)}`,
      `cwd:    ${JSON.stringify(cwd)}`,
      `env:    ${JSON.stringify(env)}`,
      `meta:   ${JSON.stringify(meta)}`
    )),
    withTime(({index, root, caller, cwd, env, meta}, {onActivity}) =>
      new Promise((resolve) => {
        let stdout = '', stderr = '', interval = 0, caughtError = null;
        const child = spawn(cmd, args, {cwd, env, shell: true, stdio: 'pipe'});
        addOrRemove(true);

        // use hoisted functions to permit removal of listeners that were added
        function addOrRemove(isAdd) {
          const field = isAdd ? 'addListener' : 'removeListener';
          child.stdout[field]('data', onStdout);
          child.stderr[field]('data', onStderr);
          child[field]('error', onError);
          child[field]('close', onClose);

          if (isAdd) {
            child.stdout.setEncoding('utf8');
            child.stderr.setEncoding('utf8');
            interval = setInterval(onActivity, 50);
          } else {
            clearInterval(interval);
          }
        }

        function onStdout(data) {
          stdout += data;
        }

        function onStderr(data) {
          stderr += data;
        }

        function onError(error) {
          caughtError = error;
        }

        function onClose(code) {
          addOrRemove(false);
          resolve({
            index, root, caller, cwd, env, meta, code, stdout,
            stderr: caughtError ? caughtError.toString() : stderr
          });
        }
      })
    ),
    lens('*', null)(({time, code}, _, log) => log(
      `time: ${time.toFixed(2)} sec`,
      `code: ${code}`
    ))
  );
};
