'use strict';

const {join} = require('path');
const outdent = require('outdent');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {withCacheBase} = require('../lib/higher-order');
const {testDefault, testRemoveCR} = require('./common/tests');
const {
  buildDevNormal, buildDevBail, buildDevNoUrl, buildProdNormal, buildProdBail, buildProdNoUrl, buildProdNoDevtool
} = require('./common/builds');
const {
  onlyMeta, assertWebpackOk, assertWebpackNotOk, assertStdout, assertNoErrors, assertNoMessages
} = require('../lib/assert');

// Allow 1-4 errors
//  - known-issue in extract-text-plugin, failed loaders will rerun webpack>=2
//  - webpack may repeat errors with a header line taken from the parent loader
const assertCssError = assertStdout('error')([1, 4])`
  ^[ ]*ERROR[^\n]*
  ([^\n]+\n){0,2}[^\n]*resolve-url-loader:[ ]*CSS error
  [ ]+source-map information is not available at url\(\) declaration \(found orphan CR, try removeCR option\)
  `;

module.exports = test(
  'orphan-carriage-return',
  layer('orphan-carriage-return')(
    cwd('.'),
    fs({
      'package.json': withCacheBase('package.json'),
      'webpack.config.js': withCacheBase('webpack.config.js'),
      'node_modules': withCacheBase('node_modules'),
      // NOTE - the CR in the calc() statement induce an offset before the url() statement is hit
      'src/index.scss': outdent`
        .some-class-name {
          font-size: calc(${'\r'}
            (${'\r'}1px${'\r'})${'\r'}
          );
        }
        
        .another-class-name {
          background-image: url('img.jpg');
        }
        `,
      'src/img.jpg': require.resolve('./assets/blank.jpg'),
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testDefault(
      onlyMeta('meta.version.webpack == 1')(
        buildDevBail(
          assertWebpackNotOk
        ),
        buildDevNormal(
          assertWebpackOk,
          assertCssError
        ),
        buildProdBail(
          assertWebpackNotOk
        ),
        buildProdNormal(
          assertWebpackOk,
          assertCssError
        )
      ),
      onlyMeta('meta.version.webpack > 1')(
        buildDevNormal(
          assertWebpackNotOk,
          assertCssError
        ),
        buildProdNormal(
          assertWebpackNotOk,
          assertCssError
        )
      )
    ),
    testRemoveCR(
      buildDevNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNoDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      )
    )
  )
);
