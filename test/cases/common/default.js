'use strict';

const sequence = require('promise-compose');
const outdent = require('outdent');

const {test, layer, unlayer, env, exec} = require('test-my-cli');
const {cleanOutputDir, trim, excludingQuotes} = require('../lib/util');
const {assertWebpackOk, logOutput, assertContent, assertCssSourceMap, assertAssetUrls, assertAssetFiles} =
  require('../lib/assert');

module.exports = test(
  'default',
  sequence(
    layer(
      env({
        DEVTOOL: '"source-map"',
        LOADER_QUERY: '?sourceMap',
        LOADER_OPTIONS: JSON.stringify({sourceMap: true}),
        CSS_QUERY: '?sourceMap',
        CSS_OPTIONS: JSON.stringify({sourceMap: true}),
        OUTPUT: 'build/[name].js'
      })
    ),
    test(
      'development',
      sequence(
        test(
          'normal-build',
          sequence(
            cleanOutputDir,
            exec('npm run webpack'),
            assertWebpackOk,
            logOutput(process.env.VERBOSE),
            assertContent(outdent`
              .someclassname {
                single-quoted: url($0);
                double-quoted: url($1);
                unquoted: url($2);
                query: url($3);
                hash: url($4);
              }
              `),
            assertCssSourceMap('env.SOURCES'),
            assertAssetUrls('env.ASSETS'),
            assertAssetFiles('env.FILES')
          )
        ),
        test(
          'without-url',
          sequence(
            layer(
              env({
                CSS_QUERY: '?sourceMap&url=false',
                CSS_OPTIONS: JSON.stringify({sourceMap: true, url: false}),
              })
            ),
            cleanOutputDir,
            exec('npm run webpack'),
            assertWebpackOk,
            logOutput(process.env.VERBOSE),
            assertContent(outdent`
              .someclassname {
                single-quoted: url($0);
                double-quoted: url($1);
                unquoted: url($2);
                query: url($3);
                hash: url($4);
              }
              `),
            assertCssSourceMap(true),
            assertAssetUrls('env.URLS', excludingQuotes),
            assertAssetFiles(false),
            unlayer
          )
        )
      )
    ),
    test(
      'production',
      sequence(
        test(
          'normal-build',
          sequence(
            cleanOutputDir,
            exec(`npm run webpack-p`),
            assertWebpackOk,
            logOutput(process.env.VERBOSE),
            assertContent(trim`
              .someclassname{single-quoted:url($0);double-quoted:url($1);unquoted:url($2);
              query:url($3);hash:url($4)}
              `),
            assertCssSourceMap('env.SOURCES'),
            assertAssetUrls('env.ASSETS'),
            assertAssetFiles('env.FILES')
          )
        ),
        test(
          'without-url',
          sequence(
            layer(
              env({
                CSS_QUERY: '?sourceMap&url=false',
                CSS_OPTIONS: JSON.stringify({sourceMap: true, url: false}),
              })
            ),
            cleanOutputDir,
            exec(`npm run webpack-p`),
            assertWebpackOk,
            logOutput(process.env.VERBOSE),
            assertContent(trim`
              .someclassname{single-quoted:url($0);double-quoted:url($1);unquoted:url($2);
              query:url($3);hash:url($4)}
              `),
            assertCssSourceMap(true),
            assertAssetUrls('env.URLS', excludingQuotes),
            assertAssetFiles(false),
            unlayer
          )
        ),
        test(
          'without-devtool',
          sequence(
            layer(
              env({DEVTOOL: 'false'})
            ),
            cleanOutputDir,
            exec(`npm run webpack-p`),
            assertWebpackOk,
            logOutput(process.env.VERBOSE),
            assertContent(trim`
              .someclassname{single-quoted:url($0);double-quoted:url($1);unquoted:url($2);
              query:url($3);hash:url($4)}
              `),
            assertCssSourceMap(false),
            assertAssetUrls('env.ASSETS'),
            assertAssetFiles('env.FILES'),
            unlayer
          )
        )
      )
    ),
    unlayer
  )
);
