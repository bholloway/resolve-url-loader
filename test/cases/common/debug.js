'use strict';

const sequence = require('promise-compose');
const {test, layer, unlayer, env, exec} = require('test-my-cli');

const {assertWebpackOk, saveOutput, assertContent, assertCssSourceMap, assertAssetUrls, assertAssetFiles} =
  require('../lib/assert');

module.exports = test(
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
    test(
      'development',
      sequence(
        layer(
          env({
            OUTPUT: 'development'
          })
        ),
        test(
          'normal-build',
          sequence(
            layer(
              env({
                OUTPUT: 'normal-build'
              })
            ),
            exec('npm run webpack-d'),
            saveOutput,
            assertWebpackOk,
            assertContent('CONTENT_DEV'),
            assertCssSourceMap('SOURCES'),
            assertAssetUrls('ASSETS'),
            assertAssetFiles('FILES'),
            unlayer
          )
        ),
        unlayer
      )
    ),
    unlayer
  )
);
