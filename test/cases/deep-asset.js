'use strict';

const {join} = require('path');
const compose = require('compose-function');
const sequence = require('promise-compose');
const outdent = require('outdent');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('../lib/util');
const {withRootBase, withCacheBase} = require('../lib/higher-order');
const {testDefault, testAbsolute, testDebug, testKeepQuery, testWithLabel} = require('./common/tests');
const {buildDevNormal, buildDevNoUrl, buildProdNormal, buildProdNoUrl, buildProdNoDevtool} = require('./common/builds');
const {moduleNotFound} = require('./common/partials');
const {
  onlyMeta, assertWebpackOk, assertNoErrors, assertNoMessages, assertContent, assertSourceMapComment,
  assertSourceMapContent, assertNoSourceMap, assertAssetUrls, assertAssetFiles, assertStdout
} = require('../lib/assert');

const assertContentDev = compose(assertContent(/;\s*}/g, ';\n}'), outdent)`
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

const assertSourcemapDev = sequence(
  assertSourceMapComment(true),
  assertSourceMapContent(({meta: {engine}}) => {
    switch (true) {
      case (engine === 'rework'):
        return outdent`
          /src/feature/index.scss
            1:1
            2:3
            3:3
            4:3
            5:3
            6:3
          
          /src/index.scss
            2:1->9:1
            3:3->10:3
            7:2
            11:2
          `;
      case (engine === 'postcss'):
        return outdent`
          /src/feature/index.scss
            1:1
            2:3 2:39->2:50
            3:3 3:39->3:50
            4:3 4:32->4:43
            5:3 5:35->5:40
            6:3 6:33->6:39
            7:2->6:41
          
          /src/index.scss
            2:1->8:1
            3:3->9:3 3:17->9:18
            4:2->9:20
          `;
      default:
        throw new Error('unexpected test configuration');
    }
  })
);

const assertContentProd = compose(assertContent(), trim)`
  .some-class-name{single-quoted:url($0);double-quoted:url($1);unquoted:url($2);query:url($3);hash:url($4)}
  .another-class-name{display:block}
  `;

const assertSourcemapProd = sequence(
  onlyMeta('meta.version.webpack < 4')(
    assertSourceMapComment(true)
  ),
  onlyMeta('meta.version.webpack >= 4')(
    assertSourceMapComment(false)
  ),
  assertSourceMapContent(({meta: {engine, version: {webpack}}}) => {
    switch (true) {
      case (engine === 'rework') && (webpack < 4):
        return outdent`
          /src/feature/index.scss
            1:1
            2:3->1:18
            3:3->1:64
            4:3->1:110
            5:3->1:149
            6:3->1:185
          
          /src/index.scss
            3:3->1:240
            7:2->1:220
          `;
      case (engine === 'rework') && (webpack === 4):
        return outdent`
          /src/feature/index.scss
            1:1
            2:3->1:64 2:3->1:18
            3:3->1:64 3:3->1:110
            4:3->1:110 4:3->1:149
            5:3->1:149 5:3->1:185
            6:3->1:185 6:3->1:219
          
          /src/index.scss
            2:1->1:220
            3:3->1:240 3:3->1:253
            7:2->1:220
            11:2->1:254
          `;
      case (engine === 'postcss') && (webpack < 4):
        return outdent`
          /src/feature/index.scss
            1:1
            2:3->1:18
            3:3->1:64
            4:3->1:110
            5:3->1:149
            6:3->1:185 6:33->1:219
          
          /src/index.scss
            2:1->1:220
            3:3->1:240 3:17->1:253
          `;
      case (engine === 'postcss') && (webpack === 4):
        return outdent`
          /src/feature/index.scss
            1:1
            2:3->1:18
            3:3->1:64
            4:3->1:110
            5:3->1:149
            6:3->1:185 6:33->1:219
          
          /src/index.scss
            2:1->1:220
            3:3->1:240 3:17->1:253
            4:2->1:254
          `;
      default:
        throw new Error('unexpected test configuration');
    }
  })
);

const assertSourceMapSources = assertSourceMapContent([
  '/src/feature/index.scss',
  '/src/index.scss'
]);

const assertDebugMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'images/img.jpg'}
  [ ]+${'./src/feature'}
  [ ]+FOUND$
  `;

module.exports = test(
  'deep-asset',
  layer('deep-asset')(
    cwd('.'),
    fs({
      'package.json': withCacheBase('package.json'),
      'webpack.config.js': withCacheBase('webpack.config.js'),
      'node_modules': withCacheBase('node_modules'),
      'src/index.scss': outdent`
        @import "feature/index.scss";
        .another-class-name {
          display: block;
        }
        `,
      'src/feature/index.scss': outdent`
        .some-class-name {
          single-quoted: url('images/img.jpg');
          double-quoted: url("images/img.jpg");
          unquoted: url(images/img.jpg);
          query: url(images/img.jpg?query);
          hash: url(images/img.jpg#hash);
        }
        `
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testWithLabel('asset-missing')(
      moduleNotFound
    ),
    layer()(
      fs({
        'src/feature/images/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          assertSourcemapDev,
          assertAssetUrls(['./feature/images/img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertSourcemapProd,
          assertAssetUrls(['./feature/images/img.jpg']),
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
      testAbsolute(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls(withRootBase(['src/feature/images/img.jpg'])),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertSourceMapSources,
          assertAssetUrls(withRootBase(['src/feature/images/img.jpg'])),
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
          assertDebugMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls(['./feature/images/img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertContentProd,
          assertSourceMapSources,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertContentProd,
          assertSourceMapSources,
          assertAssetUrls(['./feature/images/img.jpg']),
          assertAssetFiles(false)
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertContentProd,
          assertNoSourceMap,
          assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        )
      ),
      testKeepQuery(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls([
            'd68e763c825dc0e388929ae1b375ce18.jpg',
            'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
          ]),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls([
            './feature/images/img.jpg',
            './feature/images/img.jpg?query',
            './feature/images/img.jpg#hash'
          ]),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertSourceMapSources,
          assertAssetUrls([
            'd68e763c825dc0e388929ae1b375ce18.jpg',
            'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
          ]),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertSourceMapSources,
          assertAssetUrls([
            './feature/images/img.jpg',
            './feature/images/img.jpg?query',
            './feature/images/img.jpg#hash'
          ]),
          assertAssetFiles(false)
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertNoSourceMap,
          assertAssetUrls([
            'd68e763c825dc0e388929ae1b375ce18.jpg',
            'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
          ]),
          assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
        )
      )
    )
  )
);
