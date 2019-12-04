'use strict';

const {join} = require('path');
const {test, layer, env} = require('test-my-cli');

const {assertStderr} = require('../../../lib/assert');
const {escapeStr} = require('../../../lib/util');

exports.testAttempts = (...rest) =>
  test(
    'attempts=N',
    layer()(
      env({
        LOADER_OPTIONS: {attempts: 1},
        OUTPUT: 'attempts'
      }),
      ...rest,
      test('validate', assertStderr('options.attempts')(1)`attempts: (1|"1")`)
    )
  );

exports.testIncludeRoot = (...rest) =>
  test(
    'includeRoot=true',
    layer()(
      env({
        LOADER_OPTIONS: {includeRoot: true},
        OUTPUT: 'includeRoot'
      }),
      ...rest
    ),
    test('validate', assertStderr('options.includeRoot')(1)`includeRoot: true`)
  );

exports.testFail = (...rest) =>
  test(
    'fail=true',
    layer()(
      env({
        LOADER_OPTIONS: {fail: true},
        OUTPUT: 'fail'
      }),
      ...rest,
      test('validate', assertStderr('options.fail')(1)`fail: true`)
    )
  );

exports.testNonFunctionJoin = (...rest) =>
  test(
    'join=!function',
    layer()(
      env({
        LOADER_JOIN: 'return 1;',
        OUTPUT: 'non-function-join'
      }),
      ...rest,
      test('validate', assertStderr('options.join')(1)`join: 1`)
    )
  );

exports.testWrongArityJoin = (...rest) =>
  test(
    'join=!arity2',
    layer()(
      env({
        LOADER_JOIN: 'return (a) => a;',
        OUTPUT: 'wrong-arity-join'
      }),
      ...rest,
      test('validate', assertStderr('options.join')(1)`join: -unstringifyable-`)
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

exports.testSilent = (...rest) =>
  test(
    'silent=true',
    layer()(
      env({
        LOADER_OPTIONS: {silent: true},
        OUTPUT: 'silent'
      }),
      ...rest,
      test('validate', assertStderr('options.silent')(1)`silent: true`)
    )
  );

exports.testEngineFail = (...rest) =>
  test(
    'engine=fail',
    layer()(
      env({
        LOADER_OPTIONS: {engine: 'fail'},
        OUTPUT: 'engine-fail'
      }),
      ...rest,
      test('validate', assertStderr('options.engine')(1)`engine: "fail"`)
    )
  );

// TODO add failing test for keepQuery option
// TODO add failing test for absolute option
