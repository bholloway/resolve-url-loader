'use strict';

const {join} = require('path');
const compose = require('compose-function');
const outdent = require('outdent');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('./lib/util');
const {assertContent, assertCssSourceMap, assertAssetUrls, assertAssetFiles, assertDebugMsg} = require('./lib/assert');
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

const assertNoDebug = assertDebugMsg('^[ ]*resolve-url-loader:')(0);

module.exports = (engineDir) => test(
  'module-relative-asset',
  layer('module-relative-asset')(
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
          single-quoted: url('~images/img.jpg');
          double-quoted: url("~images/img.jpg");
          unquoted: url(~images/img.jpg);
          query: url(~images/img.jpg?query);
          hash: url(~images/img.jpg#hash);
        }
        `,
      'node_modules/images/img.jpg': require.resolve('./assets/blank.jpg')
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testDefault(
      devNormal(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      devWithoutUrl(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          '~images/img.jpg',
          '~images/img.jpg?query',
          '~images/img.jpg#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      prodWithoutUrl(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          '~images/img.jpg',
          '~images/img.jpg?query',
          '~images/img.jpg#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertNoDebug,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      )
    ),
    testAbsolute(
      devNormal(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      devWithoutUrl(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          '~images/img.jpg',
          '~images/img.jpg?query',
          '~images/img.jpg#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      prodWithoutUrl(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          '~images/img.jpg',
          '~images/img.jpg?query',
          '~images/img.jpg#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertNoDebug,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      )
    ),
    testDebug(
      devNormal(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      devWithoutUrl(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          '~images/img.jpg',
          '~images/img.jpg?query',
          '~images/img.jpg#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      prodWithoutUrl(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          '~images/img.jpg',
          '~images/img.jpg?query',
          '~images/img.jpg#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertNoDebug,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      )
    ),
    testKeepQuery(
      devNormal(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      devWithoutUrl(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          '~images/img.jpg',
          '~images/img.jpg?query',
          '~images/img.jpg#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      prodWithoutUrl(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          '~images/img.jpg',
          '~images/img.jpg?query',
          '~images/img.jpg#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertNoDebug,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      )
    )
  )
);