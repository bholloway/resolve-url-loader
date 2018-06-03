'use strict';

const sequence = require('promise-compose');
const {test, layer, unlayer, env, exec} = require('test-my-cli');

const {excludingQuotes} = require('../lib/util');
const {assertWebpackOk, logOutput, assertContent, assertCssSourceMap, assertAssetUrls, assertAssetFiles} =
  require('../lib/assert');

module.exports = test(
  'default',
  sequence(
    layer(
      env({
        DEVTOOL: '"source-map"',
        LOADER_QUERY: 'sourceMap',
        LOADER_OPTIONS: {sourceMap: true},
        CSS_QUERY: 'sourceMap',
        CSS_OPTIONS: {sourceMap: true},
        OUTPUT: 'build--default'
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
            exec('npm run webpack'),
            assertWebpackOk,
            logOutput(process.env.VERBOSE),
            assertContent('CONTENT_DEV'),
            assertCssSourceMap('SOURCES'),
            assertAssetUrls('ASSETS'),
            assertAssetFiles('FILES'),
            unlayer
          )
        ),
        test(
          'without-url',
          sequence(
            layer(
              env({
                CSS_QUERY: 'url=false',
                CSS_OPTIONS: {url: false},
                OUTPUT: 'without-url'
              })
            ),
            exec('npm run webpack'),
            assertWebpackOk,
            logOutput(process.env.VERBOSE),
            assertContent('CONTENT_DEV'),
            assertCssSourceMap('SOURCES'),
            assertAssetUrls('URLS', excludingQuotes),
            assertAssetFiles(false),
            unlayer
          )
        ),
        unlayer
      )
    ),
    test(
      'production',
      sequence(
        layer(
          env({
            OUTPUT: 'production'
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
            exec(`npm run webpack-p`),
            assertWebpackOk,
            logOutput(process.env.VERBOSE),
            assertContent('CONTENT_PROD'),
            assertCssSourceMap('SOURCES'),
            assertAssetUrls('ASSETS'),
            assertAssetFiles('FILES'),
            unlayer
          )
        ),
        test(
          'without-url',
          sequence(
            layer(
              env({
                CSS_QUERY: 'url=false',
                CSS_OPTIONS: {url: false},
                OUTPUT: 'without-url'
              })
            ),
            exec(`npm run webpack-p`),
            assertWebpackOk,
            logOutput(process.env.VERBOSE),
            assertContent('CONTENT_PROD'),
            assertCssSourceMap('SOURCES'),
            assertAssetUrls('URLS', excludingQuotes),
            assertAssetFiles(false),
            unlayer
          )
        ),
        test(
          'without-devtool',
          sequence(
            layer(
              env({
                DEVTOOL: false,
                OUTPUT: 'without-devtool'
              })
            ),
            exec(`npm run webpack-p`),
            assertWebpackOk,
            logOutput(process.env.VERBOSE),
            assertContent('CONTENT_PROD'),
            assertCssSourceMap(false),
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
