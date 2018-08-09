'use strict';

const {join} = require('path');
const compose = require('compose-function');
const outdent = require('outdent');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('./lib/util');
const {
  assertWebpackOk, assertNoErrors, assertContent, assertCssSourceMap, assertAssetUrls, assertAssetFiles, assertStdout
} = require('./lib/assert');
const {withCacheBase} = require('./lib/higher-order');
const {testDefault, testAbsolute, testDebug, testKeepQuery} = require('./common/tests');
const {buildDevNormal, buildDevNoUrl, buildProdNormal, buildProdNoUrl, buildProdNoDevtool} = require('./common/builds');

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

const assertSourcemapDev = assertCssSourceMap(({meta: {engine}}) => {
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
          2:3 2:42->2:43
          3:3 3:42->3:43
          4:3 4:35->4:36
          5:3 5:38->5:39
          6:3 6:36->6:37
          7:2->6:39
        
        /src/index.scss
          2:1->8:1
          3:3->9:3 3:17->9:18
          4:2->9:20
        `;
    default:
      throw new Error('unexpected test configuration');
  }
});

const assertContentProd = compose(assertContent(), trim)`
  .some-class-name{single-quoted:url($0);double-quoted:url($1);unquoted:url($2);query:url($3);hash:url($4)}
  .another-class-name{display:block}
  `;

const assertSourcemapProd = assertCssSourceMap(({meta: {engine, version: {webpack}}}) => {
  switch (true) {
    case (engine === 'rework') && (webpack < 4):
      return outdent`
        /src/feature/index.scss
          1:1
          2:3->1:18
          3:3->1:57
          4:3->1:96
          5:3->1:128
          6:3->1:163
        
        /src/index.scss
          3:3->1:216
          7:2->1:196
        `;
    case (engine === 'rework') && (webpack === 4):
      return outdent`
        /src/feature/index.scss
          1:1
          2:3->1:18
          3:3->1:57
          4:3->1:96
          5:3->1:128
          6:3->1:163
        
        /src/index.scss
          3:3->1:216 3:3->1:230
          7:2->1:196
        `;
    case (engine === 'postcss') && (webpack < 4):
      return outdent`
        /src/feature/index.scss
          1:1
          2:3->1:18
          3:3->1:57
          4:3->1:96
          5:3->1:128
          6:3->1:163 6:36->1:195
        
        /src/index.scss
          2:1->1:196
          3:3->1:216 3:17->1:229
        `;
    case (engine === 'postcss') && (webpack === 4):
      return outdent`
        /src/feature/index.scss
          1:1
          2:3->1:18
          3:3->1:57
          4:3->1:96
          5:3->1:128
          6:3->1:163 6:36->1:195
        
        /src/index.scss
          2:1->1:196
          3:3->1:216 3:17->1:229 3:17->1:230
        `;
    default:
      throw new Error('unexpected test configuration');
  }
});

const assertSources = assertCssSourceMap([
  '/src/feature/index.scss',
  '/src/index.scss'
]);

const assertNoMessages = assertStdout()(0)`resolve-url-loader:`;

module.exports = test(
  'http-asset',
  layer('http-asset')(
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
      buildDevNormal(
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
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSourcemapDev,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      buildProdNormal(
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
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSourcemapProd,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      buildProdNoDevtool(
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
      buildDevNormal(
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
      buildDevNoUrl(
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
      buildProdNormal(
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
      buildProdNoUrl(
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
      buildProdNoDevtool(
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
      buildDevNormal(
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
      buildDevNoUrl(
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
      buildProdNormal(
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
      buildProdNoUrl(
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
      buildProdNoDevtool(
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
      buildDevNormal(
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
      buildDevNoUrl(
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
      buildProdNormal(
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
      buildProdNoUrl(
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
      buildProdNoDevtool(
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
