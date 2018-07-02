'use strict';

const {normalize, join, basename} = require('path');
const spawn = require('cross-spawn');
const compose = require('compose-function');

const joi = require('../lib/joi');
const {assertInLayer} = require('../lib/assert');
const {operation, assertInOperation} = require('../lib/operation');
const {withTime, lens, sequence} = require('../lib/promise');
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
    lens('*', 'cwd')(({root, cwd}) => cwd ? compose(normalize, join)(root, cwd) : root),
    lens('*', null)(({index, cwd, env, meta}, _, log) => log(
      `layer ${index}`,
      `cmd:  ${JSON.stringify(command)}`,
      `cwd:  ${JSON.stringify(cwd)}`,
      `env:  ${JSON.stringify(env)}`,
      `meta: ${JSON.stringify(meta)}`
    )),
    withTime(({index, root, cwd, env, meta}, {onActivity}) =>
      new Promise((resolve) => {
        const interval = setInterval(onActivity, 50);
        const child = spawn(cmd, args, {cwd, env, shell: true, stdio: 'pipe'});

        let stdout = '';
        child.stdout.on('data', (data) => stdout += data);

        let stderr = '';
        child.stderr.on('data', (data) => stderr += data);

        child.once('close', (code) => {
          clearInterval(interval);
          resolve({index, root, cwd, env, meta, code, stdout, stderr});
        });

        child.once('error', (error) => {
          clearInterval(interval);
          resolve({index, root, cwd, env, meta, code: 1, stdout, stderr: error.toString()});
        });
      })
    ),
    lens('*', null)(({time, code}, _, log) => log(
      `time: ${time.toFixed(2)} sec`,
      `code: ${code}`
    ))
  );
};
