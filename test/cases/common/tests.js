'use strict';

const {join} = require('path');
const {test, layer, env} = require('test-my-cli');

exports.testBase = (...rest) =>
  layer()(
    env({
      DEVTOOL: '"source-map"',
      LOADER_QUERY: 'sourceMap',
      LOADER_OPTIONS: {sourceMap: true},
      LOADER_JOIN: '',
      CSS_QUERY: 'sourceMap',
      CSS_OPTIONS: {sourceMap: true}
    }),
    ...rest
  );

exports.testDefault = (...rest) =>
  test(
    'default',
    layer()(
      env({
        OUTPUT: 'default'
      }),
      ...rest
    )
  );

exports.testAbsolute = (...rest) =>
  test(
    'absolute=true',
    layer()(
      env({
        LOADER_QUERY: 'absolute',
        LOADER_OPTIONS: {absolute: true},
        CSS_QUERY: 'root=',
        CSS_OPTIONS: {root: ''},
        OUTPUT: 'absolute'
      }),
      ...rest
    )
  );

exports.testDebug = (...rest) =>
  test(
    'debug=true',
    layer()(
      env({
        LOADER_QUERY: 'debug',
        LOADER_OPTIONS: {debug: true},
        OUTPUT: 'debug'
      }),
      ...rest
    )
  );

exports.testKeepQuery = (...rest) =>
  test(
    'keepQuery=true',
    layer()(
      env({
        LOADER_QUERY: 'keepQuery',
        LOADER_OPTIONS: {keepQuery: true},
        OUTPUT: 'keep-query'
      }),
      ...rest
    )
  );

exports.testAttempts = (...rest) =>
  test(
    'attempts=N',
    layer()(
      env({
        LOADER_QUERY: 'attempts=1',
        LOADER_OPTIONS: {attempts: 1},
        OUTPUT: 'attempts'
      }),
      ...rest
    )
  );

exports.testIncludeRoot = (...rest) =>
  test(
    'includeRoot=true',
    layer()(
      env({
        LOADER_QUERY: 'includeRoot',
        LOADER_OPTIONS: {includeRoot: true},
        OUTPUT: 'includeRoot'
      }),
      ...rest
    )
  );

exports.testFail = (...rest) =>
  test(
    'fail=true',
    layer()(
      env({
        LOADER_QUERY: 'fail',
        LOADER_OPTIONS: {fail: true},
        OUTPUT: 'fail'
      }),
      ...rest
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
      ...rest
    )
  );

exports.testWrongArityJoin = (...rest) =>
  test(
    'join=!arity1',
    layer()(
      env({
        LOADER_JOIN: 'return (a, b) => a;',
        OUTPUT: 'wrong-arity-join'
      }),
      ...rest
    )
  );

exports.testNonStringRoot = (...rest) =>
  test(
    'root=!string',
    layer()(
      env({
        LOADER_QUERY: 'root',
        LOADER_OPTIONS: {root: true},
        OUTPUT: 'non-string-root'
      }),
      ...rest
    )
  );

exports.testNonExistentRoot = (...rest) =>
  test(
    'root=!exists',
    layer()(
      env({
        LOADER_QUERY: ({root}) => `root=${join(root, 'foo')}`,
        LOADER_OPTIONS: ({root}) => ({root: join(root, 'foo')}),
        OUTPUT: 'non-existent-root'
      }),
      ...rest
    )
  );

exports.testSilent = (...rest) =>
  test(
    'silent=true',
    layer()(
      env({
        LOADER_QUERY: 'silent',
        LOADER_OPTIONS: {silent: true},
        OUTPUT: 'silent'
      }),
      ...rest
    )
  );

exports.testEngineFail = (...rest) =>
  test(
    'engine=fail',
    layer()(
      env({
        LOADER_QUERY: 'engine=fail',
        LOADER_OPTIONS: {engine: 'fail'},
        OUTPUT: 'engine-fail'
      }),
      ...rest
    )
  );