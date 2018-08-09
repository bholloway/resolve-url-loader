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
          2:3 2:57->2:55
          3:3 3:57->3:55
          4:3 4:50->4:48
          5:3 5:53->5:45
          6:3 6:51->6:44
          7:2->6:46
        
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
          3:3->1:69
          4:3->1:120
          5:3->1:164
          6:3->1:205
        
        /src/index.scss
          3:3->1:265
          7:2->1:245
        `;
    case (engine === 'rework') && (webpack === 4):
      return outdent`
        /src/feature/index.scss
          1:1
          2:3->1:18
          3:3->1:69
          4:3->1:120
          5:3->1:164
          6:3->1:205
        
        /src/index.scss
          3:3->1:265 3:3->1:279
          7:2->1:245
        `;
    case (engine === 'postcss') && (webpack < 4):
      return outdent`
        /src/feature/index.scss
          1:1
          2:3->1:18
          3:3->1:69
          4:3->1:120
          5:3->1:164
          6:3->1:205 6:51->1:244
        
        /src/index.scss
          2:1->1:245
          3:3->1:265 3:17->1:278
        `;
    case (engine === 'postcss') && (webpack === 4):
      return outdent`
        /src/feature/index.scss
          1:1
          2:3->1:18
          3:3->1:69
          4:3->1:120
          5:3->1:164
          6:3->1:205 6:51->1:244
        
        /src/index.scss
          2:1->1:245
          3:3->1:265 3:17->1:278 3:17->1:279
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
  ^resolve-url-loader:[ ]*${'../../../packageB/images/img.jpg'}
  [ ]+${'./src/feature'}
  [ ]+FOUND$
  `;

module.exports = test(
  'adjacent-asset',
  layer('adjacent-asset')(
    cwd('packageA'),
    fs({
      'packageA/package.json': withCacheBase('package.json'),
      'packageA/webpack.config.js': withCacheBase('webpack.config.js'),
      'packageA/node_modules': withCacheBase('node_modules'),
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
        assertAssetUrls(['../../packageB/images/img.jpg']),
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
        assertAssetUrls(['../../packageB/images/img.jpg']),
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
        assertAssetUrls(withRootBase(['packageB/images/img.jpg'])),
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
        assertAssetUrls(withRootBase(['packageB/images/img.jpg'])),
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
        assertAssetUrls(['../../packageB/images/img.jpg']),
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
        assertAssetUrls(['../../packageB/images/img.jpg']),
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
          '../../packageB/images/img.jpg',
          '../../packageB/images/img.jpg?query',
          '../../packageB/images/img.jpg#hash'
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
          '../../packageB/images/img.jpg',
          '../../packageB/images/img.jpg?query',
          '../../packageB/images/img.jpg#hash'
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
