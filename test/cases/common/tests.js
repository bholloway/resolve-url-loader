'use strict';

const sequence = require('promise-compose');
const {test, layer, unlayer, env} = require('test-my-cli');

exports.testDefault = (...rest) =>
  test(
    'default',
    sequence(
      layer(
        env({
          DEVTOOL: '"source-map"',
          LOADER_QUERY: 'sourceMap',
          LOADER_OPTIONS: {sourceMap: true},
          LOADER_JOIN: '',
          CSS_QUERY: 'sourceMap',
          CSS_OPTIONS: {sourceMap: true},
          OUTPUT: 'build--default'
        })
      ),
      ...rest,
      unlayer
    )
  );

exports.testAbsolute = (...rest) =>
  test(
    'absolute=true',
    sequence(
      layer(
        env({
          DEVTOOL: '"source-map"',
          LOADER_QUERY: 'sourceMap&absolute',
          LOADER_OPTIONS: {sourceMap: true, absolute: true},
          LOADER_JOIN: '',
          CSS_QUERY: 'sourceMap&root=',
          CSS_OPTIONS: {sourceMap: true, root: ''},
          OUTPUT: 'build--absolute'
        })
      ),
      ...rest,
      unlayer
    )
  );

exports.testDebug = (...rest) =>
  test(
    'debug',
    sequence(
      layer(
        env({
          DEVTOOL: '"source-map"',
          LOADER_QUERY: 'sourceMap',
          LOADER_OPTIONS: {sourceMap: true},
          LOADER_JOIN: `return require('resolve-url-loader').verboseJoin()`,
          CSS_QUERY: 'sourceMap',
          CSS_OPTIONS: {sourceMap: true},
          OUTPUT: 'build--debug'
        })
      ),
      ...rest,
      unlayer
    )
  );

exports.testKeepQuery = (...rest) =>
  test(
    'keepQuery=true',
    sequence(
      layer(
        env({
          DEVTOOL: '"source-map"',
          LOADER_QUERY: 'sourceMap&keepQuery',
          LOADER_OPTIONS: {sourceMap: true, keepQuery: true},
          LOADER_JOIN: '',
          CSS_QUERY: 'sourceMap',
          CSS_OPTIONS: {sourceMap: true},
          OUTPUT: 'build--keep-query'
        })
      ),
      ...rest,
      unlayer
    )
  );
