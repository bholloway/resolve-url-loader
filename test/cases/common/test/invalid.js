'use strict';

const {join} = require('path');
const {test, layer, env} = require('test-my-cli');

const {assertStderr} = require('../../../lib/assert');
const {escapeStr} = require('../../../lib/util');

exports.testNonFunctionJoin1 = (...rest) =>
  test(
    'join1=!function',
    layer()(
      env({
        LOADER_JOIN: 'return 1;',
        OUTPUT: 'non-function-join1'
      }),
      ...rest,
      test('validate', assertStderr('options.join')(1)`join: 1`)
    )
  );

exports.testWrongArityJoin1 = (...rest) =>
  test(
    'join1=!arity2',
    layer()(
      env({
        LOADER_JOIN: 'return (a) => (b) => undefined;',
        OUTPUT: 'wrong-arity-join1'
      }),
      ...rest,
      test('validate', assertStderr('options.join')(1)`join: \(a\) => \(b\) => undefined`)
    )
  );

exports.testNonFunctionJoin2 = (...rest) =>
  test(
    'join2=!function',
    layer()(
      env({
        LOADER_JOIN: 'return (a, b) => undefined;',
        OUTPUT: 'non-function-join2'
      }),
      ...rest,
      test('validate', assertStderr('options.join')(1)`join: \(a, b\) => undefined`)
    )
  );

exports.testWrongArityJoin2 = (...rest) =>
  test(
    'join2=!arity',
    layer()(
      env({
        LOADER_JOIN: 'return (a, b) => (c, d) => undefined;',
        OUTPUT: 'wrong-arity-join2'
      }),
      ...rest,
      test('validate', assertStderr('options.join')(1)`join: \(a, b\) => \(c, d\) => undefined`)
    )
  );

exports.testNonStringRoot = (...rest) =>
  test(
    'root=!string',
    layer()(
      env({
        LOADER_OPTIONS: {root: true},
        OUTPUT: 'non-string-root'
      }),
      ...rest,
      test('validate', assertStderr('options.root')(1)`root: true`)
    )
  );

exports.testNonExistentRoot = (...rest) =>
  test(
    'root=!exists',
    layer()(
      env({
        LOADER_OPTIONS: ({root}) => ({root: join(root, 'foo')}),
        OUTPUT: 'non-existent-root'
      }),
      ...rest,
      test('validate', assertStderr('options.root')(1)`root: "${escapeStr(process.cwd())}[^"]+foo"`)
    )
  );
