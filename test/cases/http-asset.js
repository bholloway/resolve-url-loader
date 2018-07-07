'use strict';

const {join} = require('path');
const compose = require('compose-function');
const outdent = require('outdent');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('./lib/util');
const {
  assertWebpackOk, assertNoErrors, assertContent, assertCssSourceMap, assertAssetUrls, assertAssetFiles, assertStdout
} = require('./lib/assert');
const {testDefault, testAbsolute, testDebug, testKeepQuery} = require('./common/tests');
const {devNormal, devWithoutUrl, prodNormal, prodWithoutUrl, prodWithoutDevtool} = require('./common/aspects');

const assertContentDev = compose(assertContent, outdent)`
  .some-class-name {
    single-quoted: url($0);
    double-quoted: url($1);
    unquoted: url($2);
    query: url($3);
    hash: url($4);
  }
  
  .another-class-name {
    display: block;
  }
  `;

const assertContentProd = compose(assertContent, trim)`
  .some-class-name{single-quoted:url($0);double-quoted:url($1);unquoted:url($2);query:url($3);hash:url($4)}
  .another-class-name{display:block}
  `;

const assertSources = assertCssSourceMap([
  '/src/feature/index.scss',
  '/src/index.scss'
]);

const assertNoMessages = assertStdout()`
  ^[ ]*resolve-url-loader:
  `(0); /* jshint ignore:line */

module.exports = (cacheDir) => test(
  'http-asset',
  layer('http-asset')(
    cwd('.'),
    fs({
      'package.json': join(cacheDir, 'package.json'),
      'webpack.config.js': join(cacheDir, 'webpack.config.js'),
      'node_modules': join(cacheDir, 'node_modules'),
      'src/index.scss': outdent`
        @import "feature/index.scss";
        .another-class-name {
          display: block;
        }
        `,
      'src/feature/index.scss': outdent`
        .some-class-name {
          single-quoted: url('http://google.com');
          double-quoted: url("http://google.com");
          unquoted: url(http://google.com);
          query: url(http://google.com?query);
          hash: url(http://google.com#hash);
        }
        `
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testDefault(
      devNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      devWithoutUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      )
    ),
    testAbsolute(
      devNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      devWithoutUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      )
    ),
    testDebug(
      devNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      devWithoutUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      )
    ),
    testKeepQuery(
      devNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      devWithoutUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      )
    )
  )
);
