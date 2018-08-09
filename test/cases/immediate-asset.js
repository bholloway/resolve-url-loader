'use strict';

const {join} = require('path');
const compose = require('compose-function');
const outdent = require('outdent');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('./lib/util');
const {
  assertWebpackOk, assertNoErrors, assertContent, assertCssSourceMap, assertAssetUrls, assertAssetFiles, assertStdout
} = require('./lib/assert');
const {withRootBase, withCacheBase} = require('./lib/higher-order');
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
          2:3 2:32->2:43
          3:3 3:32->3:43
          4:3 4:25->4:36
          5:3 5:28->5:33
          6:3 6:26->6:32
          7:2->6:34
        
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
          6:3->1:157
        
        /src/index.scss
          3:3->1:205
          7:2->1:185
        `;
    case (engine === 'rework') && (webpack === 4):
      return outdent`
        /src/feature/index.scss
          1:1
          2:3->1:18
          3:3->1:57
          4:3->1:96
          5:3->1:128
          6:3->1:157
        
        /src/index.scss
          3:3->1:205 3:3->1:219
          7:2->1:185
        `;
    case (engine === 'postcss') && (webpack < 4):
      return outdent`
        /src/feature/index.scss
          1:1
          2:3->1:18
          3:3->1:57
          4:3->1:96
          5:3->1:128
          6:3->1:157 6:26->1:184
        
        /src/index.scss
          2:1->1:185
          3:3->1:205 3:17->1:218
        `;
    case (engine === 'postcss') && (webpack === 4):
      return outdent`
        /src/feature/index.scss
          1:1
          2:3->1:18
          3:3->1:57
          4:3->1:96
          5:3->1:128
          6:3->1:157 6:26->1:184
        
        /src/index.scss
          2:1->1:185
          3:3->1:205 3:17->1:218 3:17->1:219
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

const assertDebugMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[ ]*${'img.jpg'}
  [ ]+${'./src/feature'}
  [ ]+FOUND$
  `;

module.exports = test(
  'immediate-asset',
  layer('immediate-asset')(
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
          single-quoted: url('img.jpg');
          double-quoted: url("img.jpg");
          unquoted: url(img.jpg);
          query: url(img.jpg?query);
          hash: url(img.jpg#hash);
        }
        `,
      'src/feature/img.jpg': require.resolve('./assets/blank.jpg')
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
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSourcemapDev,
        assertAssetUrls(['./feature/img.jpg']),
        assertAssetFiles(false)
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSourcemapProd,
        assertAssetUrls(['./feature/img.jpg']),
        assertAssetFiles(false)
      ),
      buildProdNoDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertCssSourceMap(false),
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
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSources,
        assertAssetUrls(withRootBase(['src/feature/img.jpg'])),
        assertAssetFiles(false)
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls(withRootBase(['src/feature/img.jpg'])),
        assertAssetFiles(false)
      ),
      buildProdNoDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertCssSourceMap(false),
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
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertDebugMessages,
        assertContentDev,
        assertSources,
        assertAssetUrls(['./feature/img.jpg']),
        assertAssetFiles(false)
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertDebugMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertDebugMessages,
        assertContentProd,
        assertSources,
        assertAssetUrls(['./feature/img.jpg']),
        assertAssetFiles(false)
      ),
      buildProdNoDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertDebugMessages,
        assertContentProd,
        assertCssSourceMap(false),
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
        assertSources,
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
        assertSources,
        assertAssetUrls([
          './feature/img.jpg',
          './feature/img.jpg?query',
          './feature/img.jpg#hash'
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
        assertSources,
        assertAssetUrls([
          './feature/img.jpg',
          './feature/img.jpg?query',
          './feature/img.jpg#hash'
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
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      )
    )
  )
);
