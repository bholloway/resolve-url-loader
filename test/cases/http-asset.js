'use strict';

const {dirname, join} = require('path');
const compose = require('compose-function');
const outdent = require('outdent');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('./lib/util');
const {assertContent, assertCssSourceMap, assertAssetUrls, assertAssetFiles, assertDebugMessages} =
  require('./lib/assert');
const {withRebase} = require('./lib/higher-order');
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

const assertNoDebug = assertDebugMessages(/^resolve-url-loader/)(false);

module.exports = (engineDir) => test(
  'http-asset',
  layer('http-asset')(
    cwd('.'),
    fs({
      'package.json': join(engineDir, 'package.json'),
      'webpack.config.js': join(engineDir, 'webpack.config.js'),
      'node_modules': compose(withRebase, join)('..', '..', 'node_modules'),
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
      PATH: dirname(process.execPath),
      ENTRY: join('src', 'index.scss')
    }),
    testDefault(
      devNormal(
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
        assertNoDebug,
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
