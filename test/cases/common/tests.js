'use strict';

const {join} = require('path');
const {test, layer, env} = require('test-my-cli');

exports.testDefault = (...rest) =>
  test(
    'default',
    layer()(
      env({
        DEVTOOL: '"source-map"',
        LOADER_QUERY: 'sourceMap',
        LOADER_OPTIONS: {sourceMap: true},
        LOADER_JOIN: '',
        CSS_QUERY: 'sourceMap',
        CSS_OPTIONS: {sourceMap: true},
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
        DEVTOOL: '"source-map"',
        LOADER_QUERY: 'sourceMap&absolute',
        LOADER_OPTIONS: {sourceMap: true, absolute: true},
        LOADER_JOIN: '',
        CSS_QUERY: 'sourceMap&root=',
        CSS_OPTIONS: {sourceMap: true, root: ''},
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
        DEVTOOL: '"source-map"',
        LOADER_QUERY: 'sourceMap&debug',
        LOADER_OPTIONS: {sourceMap: true, debug: true},
        LOADER_JOIN: '',
        CSS_QUERY: 'sourceMap',
        CSS_OPTIONS: {sourceMap: true},
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
        DEVTOOL: '"source-map"',
        LOADER_QUERY: 'sourceMap&keepQuery',
        LOADER_OPTIONS: {sourceMap: true, keepQuery: true},
        LOADER_JOIN: '',
        CSS_QUERY: 'sourceMap',
        CSS_OPTIONS: {sourceMap: true},
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
        DEVTOOL: '"source-map"',
        LOADER_QUERY: 'attempts=1',
        LOADER_OPTIONS: {attempts: 1},
        LOADER_JOIN: '',
        CSS_QUERY: '',
        CSS_OPTIONS: {},
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
        DEVTOOL: '"source-map"',
        LOADER_QUERY: 'includeRoot',
        LOADER_OPTIONS: {includeRoot: true},
        LOADER_JOIN: '',
        CSS_QUERY: '',
        CSS_OPTIONS: {},
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
        DEVTOOL: '"source-map"',
        LOADER_QUERY: 'fail',
        LOADER_OPTIONS: {fail: true},
        LOADER_JOIN: '',
        CSS_QUERY: '',
        CSS_OPTIONS: {},
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
        DEVTOOL: '"source-map"',
        LOADER_QUERY: '',
        LOADER_OPTIONS: {},
        LOADER_JOIN: 'return 1;',
        CSS_QUERY: '',
        CSS_OPTIONS: {},
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
        DEVTOOL: '"source-map"',
        LOADER_QUERY: '',
        LOADER_OPTIONS: {},
        LOADER_JOIN: 'return (a, b) => a;',
        CSS_QUERY: '',
        CSS_OPTIONS: {},
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
        DEVTOOL: '"source-map"',
        LOADER_QUERY: 'root',
        LOADER_OPTIONS: {root: true},
        LOADER_JOIN: '',
        CSS_QUERY: '',
        CSS_OPTIONS: {},
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
        DEVTOOL: '"source-map"',
        LOADER_QUERY: ({root}) => `root=${join(root, 'foo')}`,
        LOADER_OPTIONS: ({root}) => ({root: join(root, 'foo')}),
        LOADER_JOIN: '',
        CSS_QUERY: '',
        CSS_OPTIONS: {},
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
        DEVTOOL: '"source-map"',
        LOADER_QUERY: 'engine=fail',
        LOADER_OPTIONS: {engine: 'fail'},
        LOADER_JOIN: '',
        CSS_QUERY: '',
        CSS_OPTIONS: {},
        OUTPUT: 'engine-fail'
      }),
      ...rest
    )
  );