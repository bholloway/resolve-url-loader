'use strict';

const {join} = require('path');
const sequence = require('promise-compose');
const {test, layer, meta, env} = require('test-my-cli');

const {onlyMeta, assertStderr} = require('../../lib/assert');

exports.all = (...tests) => (...rest) =>
  sequence(...tests.map((test) => test(...rest)));

exports.testBase = (engine) => (...rest) =>
  test(
    `engine=${engine}`,
    layer(engine)(
      meta({
        engine
      }),
      env({
        DEVTOOL: '"source-map"',
        LOADER_QUERY: `sourceMap&engine=${engine}`,
        LOADER_OPTIONS: {sourceMap: true, engine},
        LOADER_JOIN: '',
        CSS_QUERY: 'sourceMap',
        CSS_OPTIONS: {sourceMap: true}
      }),
      ...rest,
      test('validate', sequence(
        assertStderr('options.sourceMap')(1)`sourceMap: true`,
        assertStderr('options.engine')(1)`engine: "${engine}"`
      ))
    )
  );

exports.testWithLabel = (label) => (...rest) =>
  test(
    label,
    layer()(
      env({
        OUTPUT: label
      }),
      ...rest
    )
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

// css-loader deprecated options.root around the time of webpack@4
exports.testAbsolute = (...rest) =>
  onlyMeta('meta.version.webpack < 4')(
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
        ...rest,
        test('validate', assertStderr('options.absolute')(1)`absolute: true`)
      )
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
      ...rest,
      test('validate', assertStderr('options.debug')(1)`debug: true`)
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
      ...rest,
      test('validate', assertStderr('options.keepQuery')(1)`keepQuery: true`)
    )
  );

exports.testRemoveCR = (...rest) =>
  test(
    'removeCR=true',
    layer()(
      env({
        LOADER_QUERY: 'removeCR',
        LOADER_OPTIONS: {removeCR: true},
        OUTPUT: 'remove-CR'
      }),
      ...rest,
      test('validate', assertStderr('options.removeCR')(1)`removeCR: true`)
    )
  );

exports.testRoot = (...rest) =>
  test(
    'root=empty',
    layer()(
      env({
        LOADER_QUERY: 'root=',
        LOADER_OPTIONS: {root: ''},
        OUTPUT: 'root'
      }),
      ...rest,
      test('validate', assertStderr('options.root')(1)`root: ""`)
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
      ...rest,
      test('validate', assertStderr('options.attempts')(1)`attempts: (1|"1")`)
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
    ),
    test('validate', assertStderr('options.includeRoot')(1)`includeRoot: true`)
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
        LOADER_QUERY: 'root',
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
        LOADER_QUERY: ({root}) => `root=${join(root, 'foo')}`,
        LOADER_OPTIONS: ({root}) => ({root: join(root, 'foo')}),
        OUTPUT: 'non-existent-root'
      }),
      ...rest,
      test('validate', assertStderr('options.root')(1)`root: ".*[\\\/]foo"`)
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
      ...rest,
      test('validate', assertStderr('options.silent')(1)`silent: true`)
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
      ...rest,
      test('validate', assertStderr('options.engine')(1)`engine: "fail"`)
    )
  );
