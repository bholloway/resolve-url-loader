'use strict';

const {join} = require('path');
const {test, layer, env} = require('test-my-cli');

const {assertStderr} = require('../../../lib/assert');
const {escapeStr} = require('../../../lib/util');

exports.testKeepQuery = (...rest) =>
  test(
    'keepQuery=true',
    layer()(
      env({
        LOADER_OPTIONS: {keepQuery: true},
        OUTPUT: 'keepQuery'
      }),
      ...rest,
      test('validate', assertStderr('options.keepQuery')(1)`keepQuery: true`)
    )
  );

exports.testAbsolute = (...rest) =>
  test(
    'absolute=true',
    layer()(
      env({
        LOADER_OPTIONS: {absolute: true},
        OUTPUT: 'absolute'
      }),
      ...rest,
      test('validate', assertStderr('options.absolute')(1)`absolute: true`)
    )
  );

exports.testAttempts = (...rest) =>
  test(
    'attempts=N',
    layer()(
      env({
        LOADER_OPTIONS: {attempts: 1},
        OUTPUT: 'attempts'
      }),
      ...rest,
      test('validate', assertStderr('options.attempts')(1)`attempts: 1`)
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
    'join=!arity1',
    layer()(
      env({
        LOADER_JOIN: 'return (a, b) => undefined;',
        OUTPUT: 'wrong-arity-join'
      }),
      ...rest,
      test('validate', assertStderr('options.join')(1)`join: \(a, b\) => undefined`)
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

exports.testEngineFailInitialisation = (...rest) =>
  test(
    'engine=fail-initialisation',
    layer()(
      env({
        LOADER_OPTIONS: {engine: 'fail-initialisation'},
        OUTPUT: 'engine-fail-initialisation'
      }),
      ...rest,
      test('validate', assertStderr('options.engine')(1)`engine: "fail-initialisation"`)
    )
  );

exports.testEngineFailProcessing = (...rest) =>
  test(
    'engine=fail-processing',
    layer()(
      env({
        LOADER_OPTIONS: {engine: 'fail-processing'},
        OUTPUT: 'engine-fail-processing'
      }),
      ...rest,
      test('validate', assertStderr('options.engine')(1)`engine: "fail-processing"`)
    )
  );
