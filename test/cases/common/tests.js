'use strict';

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
