'use strict';

const compose = require('compose-function');
const sequence = require('promise-compose');
const outdent = require('outdent');

const {test, layer, unlayer, env, exec} = require('test-my-cli');
const {cleanOutputDir, trim, excludingHash, excludingQuery, excludingQuotes} = require('../lib/util');
const {assertWebpackOk, assertContent, assertCssSourceMap, assertAssetUrls, assertAssetFiles} =
  require('../lib/assert');

module.exports = test(
  'keepQuery=true',
  sequence(
    layer(
      env({
        DEVTOOL: '"source-map"',
        LOADER_QUERY: '?sourceMap&keepQuery',
        LOADER_OPTIONS: JSON.stringify({sourceMap: true, keepQuery: true}),
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
            assertAssetUrls('env.ASSETS', excludingHash),
            assertAssetFiles('env.FILES', excludingHash)
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
            assertAssetUrls('env.URLS', compose(excludingHash, excludingQuery, excludingQuotes)),
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
            assertContent(trim`
              .someclassname{single-quoted:url($0);double-quoted:url($1);unquoted:url($2);
              query:url($3);hash:url($4)}
              `),
            assertCssSourceMap('env.SOURCES'),
            assertAssetUrls('env.ASSETS', compose(excludingHash, excludingQuery)),
            assertAssetFiles('env.FILES', compose(excludingHash, excludingQuery))
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
            assertContent(trim`
              .someclassname{single-quoted:url($0);double-quoted:url($1);unquoted:url($2);
              query:url($3);hash:url($4)}
              `),
            assertCssSourceMap(true),
            assertAssetUrls('env.URLS', compose(excludingHash, excludingQuery, excludingQuotes)),
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
            assertContent(trim`
              .someclassname{single-quoted:url($0);double-quoted:url($1);unquoted:url($2);
              query:url($3);hash:url($4)}
              `),
            assertCssSourceMap(false),
            assertAssetUrls('env.ASSETS', compose(excludingHash, excludingQuery)),
            assertAssetFiles('env.FILES', compose(excludingHash, excludingQuery)),
            unlayer
          )
        )
      )
    ),
    unlayer
  )
);
