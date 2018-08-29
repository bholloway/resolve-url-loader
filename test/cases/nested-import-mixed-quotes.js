'use strict';

const {join} = require('path');
const compose = require('compose-function');
const sequence = require('promise-compose');
const outdent = require('outdent');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('../lib/util');
const {withCacheBase} = require('../lib/higher-order');
const {testDefault, testAbsolute, testDebug, testKeepQuery} = require('./common/tests');
const {buildDevNormal, buildDevNoUrl, buildProdNormal, buildProdNoUrl, buildProdNoDevtool} = require('./common/builds');
const {
  onlyMeta, assertWebpackOk, assertNoErrors, assertNoMessages, assertContent, assertSourceMapComment,
  assertSourceMapContent, assertNoSourceMap, assertAssetUrls, assertAssetFiles
} = require('../lib/assert');

const assertContentDev = compose(assertContent(/;\s*}/g, ';\n}'), outdent)`
  .some-class-name .another-class-name {
    background-image: url($0);
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
          
          /src/index.scss
            3:2
          `;
      case (engine === 'postcss'):
        return outdent`
          /src/feature/index.scss
            1:1
          
          /src/index.scss
            2:3 2:248->2:249
            3:2->2:251
          `;
      default:
        throw new Error('unexpected test configuration');
    }
  })
);

const assertSourceMapSourcesDev = assertSourceMapContent([
  '/src/feature/index.scss',
  '/src/index.scss'
]);

const assertContentProd = compose(assertContent(), trim)`
  .some-class-name${' '}.another-class-name {
    background-image: url($0)
  }
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
            2:3->1:38
          `;
      case (engine === 'rework') && (webpack === 4):
        return outdent`
          /src/feature/index.scss
            1:1
            2:3->1:38 2:3->1:282
          
          /src/index.scss
            3:2->1:283
          `;
      case (engine === 'postcss') && (webpack < 4):
        return outdent`
          /src/feature/index.scss
            1:1
          
          /src/index.scss
            2:3->1:38 2:248->1:282
          `;
      case (engine === 'postcss') && (webpack === 4):
        return outdent`
          /src/feature/index.scss
            1:1
          
          /src/index.scss
            2:3->1:38 2:248->1:282
            3:2->1:283
          `;
      default:
        throw new Error('unexpected test configuration');
    }
  })
);

const assertSourceMapSourcesProd = assertSourceMapContent(({meta: {engine, version: {webpack}}}) => {
  switch (true) {
    case (engine === 'rework') && (webpack < 4):
      // known issue with reworkcss dropping sourcemap sources (#52)
      return [
        '/src/feature/index.scss',
      ];
    default:
      return [
        '/src/feature/index.scss',
        '/src/index.scss'
      ];
  }
});

const assertAssets = sequence(
  assertAssetUrls([
    trim`
      "data:image/svg+xml;charset=utf8,%3Csvg viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath
      stroke='rgba(0, 0, 0, 0.5)' stroke-width='2' stroke-linecap='round' stroke-miterlimit='10'
      d='M4 7h22M4 15h22M4 23h22'/%3E%3C/svg%3E"
      `
  ]),
  assertAssetFiles(false)
);

module.exports = test(
  'nested-import-mixed-quotes',
  layer('nested-import-mixed-quotes')(
    cwd('.'),
    fs({
      'package.json': withCacheBase('package.json'),
      'webpack.config.js': withCacheBase('webpack.config.js'),
      'node_modules': withCacheBase('node_modules'),
      'src/index.scss': outdent`
        .some-class-name {
          @import "feature/index.scss";
        }
        `,
      'src/feature/index.scss': outdent`
        .another-class-name {
          background-image: url(${trim`
          "data:image/svg+xml;charset=utf8,%3Csvg viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath
          stroke='rgba(0, 0, 0, 0.5)' stroke-width='2' stroke-linecap='round' stroke-miterlimit='10'
          d='M4 7h22M4 15h22M4 23h22'/%3E%3C/svg%3E"
          `});
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
        assertSourceMapSourcesDev,
        assertAssets
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSourcemapDev,
        assertAssets
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSourceMapSourcesProd,
        assertAssets
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSourcemapProd,
        assertAssets
      ),
      buildProdNoDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertNoSourceMap,
        assertAssets
      )
    ),
    testAbsolute(
      buildDevNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSourceMapSourcesDev,
        assertAssets
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSourceMapSourcesDev,
        assertAssets
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSourceMapSourcesProd,
        assertAssets
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSourceMapSourcesProd,
        assertAssets
      ),
      buildProdNoDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertNoSourceMap,
        assertAssets
      )
    ),
    testDebug(
      buildDevNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSourceMapSourcesDev,
        assertAssets
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSourceMapSourcesDev,
        assertAssets
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSourceMapSourcesProd,
        assertAssets
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSourceMapSourcesProd,
        assertAssets
      ),
      buildProdNoDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertNoSourceMap,
        assertAssets
      )
    ),
    testKeepQuery(
      buildDevNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSourceMapSourcesDev,
        assertAssets
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentDev,
        assertSourceMapSourcesDev,
        assertAssets
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSourceMapSourcesProd,
        assertAssets
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertSourceMapSourcesProd,
        assertAssets
      ),
      buildProdNoDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertContentProd,
        assertNoSourceMap,
        assertAssets
      )
    )
  )
);
