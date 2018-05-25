'use strict';

const {basename} = require('path');

const spawn = require('cross-spawn');
const compose = require('compose-function');

const joi = require('../lib/joi');
const {operation, assertInOperation} = require('../lib/operation');
const {withTime, lens, sequence} = require('../lib/promise');

const NAME = basename(__filename).slice(0, -3);

exports.schema = {
  debug: joi.debug().optional()
};

/**
 * Given a command the method will execute in shell and resolve the results, discarding layers.
 *
 * @param {string} command A shell command
 * @return {function(Array):Array} A pure function of layers
 */
exports.create = (command) => {
  joi.assert(
    command,
    joi.string().min(2).required(),
    'single shell command'
  );
  const [cmd, ...args] = command.split(' ');

  return compose(operation(NAME), lens('layers', 'exec'), sequence)(
    assertInOperation(`misuse: ${NAME}() somehow escaped the operation`),
    (layers, _, log) => {

      // locate cwd (required) and env (optional)
      const {cwd: cwdGetter} = layers.find(({cwd}) => !!cwd) || {};
      const {env: envGetter} = layers.find(({env}) => !!env) || {};
      if (!cwdGetter) {
        throw new Error('There must be a preceding cwd() element before exec()');
      }

      // resolve cwd and env
      const cwd = cwdGetter();
      const env = envGetter ? envGetter() : {};
      log(
        `layer ${layers.length}`,
        `cmd ${JSON.stringify(command)}`,
        `cwd ${JSON.stringify(cwd)}`,
        `env ${JSON.stringify(env)}`
      );

      return {cwd, env};
    },
    withTime(({cwd, env}, {root, onActivity}) =>
      new Promise((resolve) => {
        const interval = setInterval(onActivity, 50);
        const child = spawn(cmd, args, {cwd, env, shell: true, stdio: 'pipe'});

        let stdout = '';
        child.stdout.on('data', (data) => stdout += data);

        let stderr = '';
        child.stderr.on('data', (data) => stderr += data);

        child.once('close', (code) => {
          clearInterval(interval);
          resolve({root, cwd, env, code, stdout, stderr});
        });

        child.once('error', (error) => {
          clearInterval(interval);
          resolve({root, cwd, env, code: 1, stdout, stderr: error.toString()});
        });
      })
    ),
    lens('*', null)(({time, code}, _, log) => log(`time: ${time} sec\ncode: ${code}`))
  );
};
