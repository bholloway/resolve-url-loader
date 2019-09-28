'use strict';

const {join} = require('path');
const compose = require('compose-function');
const outdent = require('outdent');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('../lib/util');
const {withCacheBase} = require('../lib/higher-order');
const {testDefault, testDebug, testWithLabel} = require('./common/tests');
const {buildDevNormal, buildDevNoUrl, buildProdNormal, buildProdNoUrl, buildProdNoDevtool} = require('./common/builds');
const {moduleNotFound} = require('./common/partials');
const {
  assertWebpackOk, assertNoErrors, assertNoMessages, assertContent, assertNoSourceMap, assertAssetUrls,
  assertAssetFiles, assertStdout
} = require('../lib/assert');

const assertContentDev = compose(assertContent(/;\s*}/g, ';\n}'), outdent)`
  .some-class-name {
    background-image: url($0);
  }
  `;

const assertContentProd = compose(assertContent(), trim)`
  .some-class-name{background-image: url($0)}
  `;

const assertIncludeMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/feature'}
  [ ]+${'./src'}
  [ ]+FOUND$
  `;

const assertMixinMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/feature'}
  [ ]+FOUND$
  `;

module.exports = test(
  'declaration-mixin',
  layer('declaration-mixin')(
    cwd('.'),
    fs({
      'package.json': withCacheBase('package.json'),
      'webpack.config.js': withCacheBase('webpack.config.js'),
      'node_modules': withCacheBase('node_modules'),
      'src/index.scss': outdent`
          @import "feature/mixins.scss";
          .some-class-name {
            @include feature;
          }
          `,
      'src/feature/mixins.scss': outdent`
          @mixin feature {
            background-image: url('img.jpg');
          }
          `,
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testWithLabel('asset-missing')(
      moduleNotFound
    ),
    testWithLabel('asset-include')(
      fs({
        'src/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          // assertSourcemapDev,
          assertAssetUrls(['./img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          // assertSourcemapProd,
          assertAssetUrls(['./img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertNoSourceMap,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        )
      ),
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertIncludeMessages,
          assertContentDev,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertIncludeMessages,
          assertContentDev,
          // assertSourcemapDev,
          assertAssetUrls(['./img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertIncludeMessages,
          assertContentProd,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertIncludeMessages,
          assertContentProd,
          // assertSourcemapProd,
          assertAssetUrls(['./img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertIncludeMessages,
          assertContentProd,
          assertNoSourceMap,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        )
      )
    ),
    testWithLabel('asset-mixin')(
      fs({
        'src/feature/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          // assertSourcemapDev,
          assertAssetUrls(['./feature/img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          // assertSourcemapProd,
          assertAssetUrls(['./feature/img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertNoSourceMap,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        )
      ),
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMixinMessages,
          assertContentDev,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertMixinMessages,
          assertContentDev,
          // assertSourcemapDev,
          assertAssetUrls(['./feature/img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMixinMessages,
          assertContentProd,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertMixinMessages,
          assertContentProd,
          // assertSourcemapProd,
          assertAssetUrls(['./feature/img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertMixinMessages,
          assertContentProd,
          assertNoSourceMap,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        )
      )
    )
  )
);
