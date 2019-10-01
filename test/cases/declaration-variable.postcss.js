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
    background-image: some url($0) somewhere;
  }
  `;

const assertContentProd = compose(assertContent(), trim)`
  .some-class-name{background-image: some${' '}url($0)${' '}somewhere}
  `;

const assertDebugPropertyMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/value/substring'}
  [ ]+${'./src/value'}
  [ ]+${'./src'}
  [ ]+FOUND$
  `;

const assertDebugValueMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/value/substring'}
  [ ]+${'./src/value'}
  [ ]+FOUND$
  `;

const assertDebugSubstringMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/value/substring'}
  [ ]+FOUND$
  `;

module.exports = test(
  'declaration-variable',
  layer('declaration-variable')(
    cwd('.'),
    fs({
      'package.json': withCacheBase('package.json'),
      'webpack.config.js': withCacheBase('webpack.config.js'),
      'node_modules': withCacheBase('node_modules'),
      'src/index.scss': outdent`
          @import "value/variables.scss";
          .some-class-name {
            background-image: $value;
          }
          `,
      'src/value/variables.scss': outdent`
          @import "substring/variables.scss";
          $value: some $url somewhere
          `,
      'src/value/substring/variables.scss': outdent`
          $url: url('img.jpg');
          `,
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testWithLabel('asset-missing')(
      moduleNotFound
    ),
    testWithLabel('asset-property')(
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
          assertDebugPropertyMessages,
          assertContentDev,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertDebugPropertyMessages,
          assertContentDev,
          // assertSourcemapDev,
          assertAssetUrls(['./img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDebugPropertyMessages,
          assertContentProd,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertDebugPropertyMessages,
          assertContentProd,
          // assertSourcemapProd,
          assertAssetUrls(['./img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertDebugPropertyMessages,
          assertContentProd,
          assertNoSourceMap,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        )
      )
    ),
    testWithLabel('asset-value')(
      fs({
        'src/value/img.jpg': require.resolve('./assets/blank.jpg')
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
          assertAssetUrls(['./value/img.jpg']),
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
          assertAssetUrls(['./value/img.jpg']),
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
          assertDebugValueMessages,
          assertContentDev,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertDebugValueMessages,
          assertContentDev,
          // assertSourcemapDev,
          assertAssetUrls(['./value/img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDebugValueMessages,
          assertContentProd,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertDebugValueMessages,
          assertContentProd,
          // assertSourcemapProd,
          assertAssetUrls(['./value/img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertDebugValueMessages,
          assertContentProd,
          assertNoSourceMap,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        )
      )
    ),
    testWithLabel('asset-value-substring')(
      fs({
        'src/value/substring/img.jpg': require.resolve('./assets/blank.jpg')
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
          assertAssetUrls(['./value/substring/img.jpg']),
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
          assertAssetUrls(['./value/substring/img.jpg']),
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
          assertDebugSubstringMessages,
          assertContentDev,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertDebugSubstringMessages,
          assertContentDev,
          // assertSourcemapDev,
          assertAssetUrls(['./value/substring/img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDebugSubstringMessages,
          assertContentProd,
          // assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertDebugSubstringMessages,
          assertContentProd,
          // assertSourcemapProd,
          assertAssetUrls(['./value/substring/img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertDebugSubstringMessages,
          assertContentProd,
          assertNoSourceMap,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        )
      )
    )
  )
);
