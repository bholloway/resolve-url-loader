'use strict';

const {relative, join} = require('path');
const {assert} = require('test-my-cli');
const ms = require('ms');
const sequence = require('promise-compose');

exports.bail = assert((_, {code}) => (code !== 0) && process.exit(code));

exports.assertExitCodeZero = (message) =>
  assert(({pass, fail}, {code, stderr, time}) =>
    (code === 0) ? pass(`${message} (${ms(Math.round(time), {long: true})})`) : fail(stderr)
  );

exports.assertExitCodeNonZero = (message) =>
  assert(({pass, fail}, {code}) =>
    (code === 0) ? fail(`${message} unexpectantly exited cleanly`) : pass(`${message} should not exit cleanly`)
  );

exports.assertCurrentRootDirectory = assert(({pass}, {caller, cwd, env: { OUTPUT}}) => {
  pass(`(${relative(process.cwd(), caller)})`);
  pass(`(${relative(process.cwd(), join(cwd, OUTPUT))})`);
});

exports.assertWebpackOk = sequence(
  exports.assertCurrentRootDirectory,
  exports.assertExitCodeZero('webpack')
);

exports.assertWebpackNotOk = sequence(
  exports.assertCurrentRootDirectory,
  exports.assertExitCodeNonZero('webpack')
);

exports.assertNoErrors = assert(({pass, fail}, {stdout}) => {
  const lines = stdout.split('\n');
  const start = lines.findIndex(line => /\bERROR\b/.test(line));
  if (start < 0) {
    pass('should be free of compile errors');
  } else {
    const end = lines.findIndex((line, i) => line.trim() === '' && i > start) || lines.length;
    const error = lines.slice(start, end).join('\n');
    return fail(error);
  }
});

