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

const assertDebugJoins = assertDebugMsg`
  ^resolve-url-loader:[ ]*${'../../../packageB/images/img.jpg'}
  [ ]+${'./src/feature'}
  [ ]+FOUND$
  `;

module.exports = (cacheDir) => test(
  'adjacent-asset',
  layer('adjacent-asset')(
    cwd('packageA'),
    fs({
      'packageA/package.json': join(cacheDir, 'package.json'),
      'packageA/webpack.config.js': join(cacheDir, 'webpack.config.js'),
      'packageA/node_modules': join(cacheDir, 'node_modules'),
      'packageA/src/index.scss': outdent`
        @import "feature/index.scss";
        .another-class-name {
          display: block;
        }
        `,
      'packageA/src/feature/index.scss': outdent`
        .some-class-name {
          single-quoted: url('../../../packageB/images/img.jpg');
          double-quoted: url("../../../packageB/images/img.jpg");
          unquoted: url(../../../packageB/images/img.jpg);
          query: url(../../../packageB/images/img.jpg?query);
          hash: url(../../../packageB/images/img.jpg#hash);
        }
        `,
      'packageB/package.json': outdent`
        {
          "name": "packageB" 
        }
        `,
      'packageB/images/img.jpg': require.resolve('./assets/blank.jpg')
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testDefault(
      devNormal(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      devWithoutUrl(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls(['../../packageB/images/img.jpg']),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      prodWithoutUrl(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls(['../../packageB/images/img.jpg']),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertNoDebug,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      )
    ),
    testAbsolute(
      devNormal(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      devWithoutUrl(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls(withRebase(['packageB/images/img.jpg'])),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      prodWithoutUrl(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls(withRebase(['packageB/images/img.jpg'])),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertNoDebug,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      )
    ),
    testDebug(
      devNormal(
        assertDebugJoins(1),
        assertContentDev,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      devWithoutUrl(
        assertDebugJoins(1),
        assertContentDev,
        assertSources,
        assertAssetUrls(['../../packageB/images/img.jpg']),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertDebugJoins(1),
        assertContentProd,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      prodWithoutUrl(
        assertDebugJoins(1),
        assertContentProd,
        assertSources,
        assertAssetUrls(['../../packageB/images/img.jpg']),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertDebugJoins(1),
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
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
          '../../packageB/images/img.jpg',
          '../../packageB/images/img.jpg?query',
          '../../packageB/images/img.jpg#hash'
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
          '../../packageB/images/img.jpg',
          '../../packageB/images/img.jpg?query',
          '../../packageB/images/img.jpg#hash'
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
