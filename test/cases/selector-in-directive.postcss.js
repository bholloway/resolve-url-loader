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
  @font-face {
    .some-class-name {
      src: url($0) format("embedded-opentype"), url($1) format("truetype"), url($2) format(woff), url($3) format(svg);
  } }
  
  @media only screen {
    .another-class-name {
      single-quoted: url($4);
      double-quoted: url($5);
      unquoted: url($6);
      query: url($7);
      hash: url($8);
  } }
  `;

const assertSourcemapDev = sequence(
  assertSourceMapComment(true),
  assertSourceMapContent(({meta: {engine}}) => {
    switch (true) {
      case (engine === 'postcss'):
        return outdent`
          /src/feature/index.scss
            1:1
            2:3->3:5
            5:48->3:178
          
          /src/index.scss
            1:1->2:3
            3:2->3:182
            4:1->5:1
            5:3->6:3
            6:5->7:5 6:41->7:44
            7:5->8:5 7:41->8:44
            8:5->9:5 8:34->9:37
            9:5->10:5 9:37->10:34
            10:5->11:5 10:35->11:33
            11:4->11:37
          `;
      default:
        throw new Error('unexpected test configuration');
    }
  })
);

const assertContentProd = compose(assertContent(), trim)`
  @font-face{.some-class-name{
    src:url($0)${' '}format("embedded-opentype"),url($1)${' '}format("truetype"),
    url($2)${' '}format(woff),url($3)${' '}format(svg)
  }}
  @media${' '}only${' '}screen{.another-class-name{
    single-quoted:url($4);double-quoted:url($5);unquoted:url($6);query:url($7);hash:url($8)
  }}
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
      case (engine === 'postcss') && (webpack < 4):
        return outdent`
          /src/feature/index.scss
            1:1
            2:3->1:29
            5:48->1:197
          
          /src/index.scss
            1:1->1:12
            3:2->1:198
            4:1->1:199
            5:3->1:218
            6:5->1:238
            7:5->1:276
            8:5->1:314
            9:5->1:345
            10:5->1:373 10:35->1:399
            11:4->1:400
          `;
      case (engine === 'postcss') && (webpack === 4):
        return outdent`
          /src/feature/index.scss
            1:1
            2:3->1:29
            5:48->1:197
          
          /src/index.scss
            1:1->1:12
            3:2->1:198
            4:1->1:199
            5:3->1:218
            6:5->1:238
            7:5->1:276
            8:5->1:314
            9:5->1:345
            10:5->1:373 10:35->1:399
            11:4->1:400 11:4->1:401
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

const assertDebugMessages = sequence(
  assertStdout('debug')(4)`
    ^resolve-url-loader:[^:]+:[ ]*${'../fonts/font.'}\w+
    [ ]+${'./src/feature'}
    [ ]+FOUND$
    `,
  assertStdout('debug')(1)`
    ^resolve-url-loader:[^:]+:[ ]*${'images/img.jpg'}
    [ ]+${'./src'}
    [ ]+FOUND$
    `
);

module.exports = test(
  'selector-in-directive',
  layer('selector-in-directive')(
    cwd('.'),
    fs({
      'package.json': withCacheBase('package.json'),
      'webpack.config.js': withCacheBase('webpack.config.js'),
      'node_modules': withCacheBase('node_modules'),
      'src/index.scss': outdent`
        .some-class-name { 
          @import "feature/index.scss";
        }
        @media only screen {
          .another-class-name {
            single-quoted: url('images/img.jpg');
            double-quoted: url("images/img.jpg");
            unquoted: url(images/img.jpg);
            query: url(images/img.jpg?query);
            hash: url(images/img.jpg#hash);
          }
        }
        `,
      'src/feature/index.scss': outdent`
        @font-face {
          src: url('../fonts/font.eot?v=1.0#iefix') format('embedded-opentype'),
               url("../fonts/font.ttf?v=1.0") format("truetype"),
               url(../fonts/font.woff?v=1.0) format(woff),
               url(../fonts/font.svg#iefix) format(svg);
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
        'src/images/img.jpg': require.resolve('./assets/blank.jpg'),
        'src/fonts/font.eot': require.resolve('./assets/blank.jpg'),
        'src/fonts/font.ttf': require.resolve('./assets/blank.jpg'),
        'src/fonts/font.woff': require.resolve('./assets/blank.jpg'),
        'src/fonts/font.svg': require.resolve('./assets/blank.jpg')
      }),
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ]),
          assertAssetFiles([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          assertSourcemapDev,
          assertAssetUrls([
            './fonts/font.eot',
            './fonts/font.ttf',
            './fonts/font.woff',
            './fonts/font.svg',
            './images/img.jpg'
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
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ]),
          assertAssetFiles([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertSourcemapProd,
          assertAssetUrls([
            './fonts/font.eot',
            './fonts/font.ttf',
            './fonts/font.woff',
            './fonts/font.svg',
            './images/img.jpg'
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
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ]),
          assertAssetFiles([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ])
        )
      ),
      testAbsolute(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ]),
          assertAssetFiles([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls(withRootBase([
            'src/fonts/font.eot',
            'src/fonts/font.ttf',
            'src/fonts/font.woff',
            'src/fonts/font.svg',
            'src/images/img.jpg'
          ])),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertSourceMapSources,
          assertAssetUrls([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ]),
          assertAssetFiles([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertSourceMapSources,
          assertAssetUrls(withRootBase([
            'src/fonts/font.eot',
            'src/fonts/font.ttf',
            'src/fonts/font.woff',
            'src/fonts/font.svg',
            'src/images/img.jpg'
          ])),
          assertAssetFiles(false)
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertNoSourceMap,
          assertAssetUrls([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ]),
          assertAssetFiles([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ])
        )
      ),
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ]),
          assertAssetFiles([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls([
            './fonts/font.eot',
            './fonts/font.ttf',
            './fonts/font.woff',
            './fonts/font.svg',
            './images/img.jpg'
          ]),
          assertAssetFiles(false)
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertContentProd,
          assertSourceMapSources,
          assertAssetUrls([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ]),
          assertAssetFiles([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertContentProd,
          assertSourceMapSources,
          assertAssetUrls([
            './fonts/font.eot',
            './fonts/font.ttf',
            './fonts/font.woff',
            './fonts/font.svg',
            './images/img.jpg'
          ]),
          assertAssetFiles(false)
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertContentProd,
          assertNoSourceMap,
          assertAssetUrls([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ]),
          assertAssetFiles([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ])
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
            'd68e763c825dc0e388929ae1b375ce18.eot#iefix',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg#iefix',
            'd68e763c825dc0e388929ae1b375ce18.jpg',
            'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
          ]),
          assertAssetFiles([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ])
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev,
          assertSourceMapSources,
          assertAssetUrls([
            './fonts/font.eot?v=1.0#iefix',
            './fonts/font.ttf?v=1.0',
            './fonts/font.woff?v=1.0',
            './fonts/font.svg#iefix',
            './images/img.jpg',
            './images/img.jpg?query',
            './images/img.jpg#hash'
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
            'd68e763c825dc0e388929ae1b375ce18.eot#iefix',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg#iefix',
            'd68e763c825dc0e388929ae1b375ce18.jpg',
            'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
          ]),
          assertAssetFiles([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ])
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd,
          assertSourceMapSources,
          assertAssetUrls([
            './fonts/font.eot?v=1.0#iefix',
            './fonts/font.ttf?v=1.0',
            './fonts/font.woff?v=1.0',
            './fonts/font.svg#iefix',
            './images/img.jpg',
            './images/img.jpg?query',
            './images/img.jpg#hash'
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
            'd68e763c825dc0e388929ae1b375ce18.eot#iefix',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg#iefix',
            'd68e763c825dc0e388929ae1b375ce18.jpg',
            'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
          ]),
          assertAssetFiles([
            'd68e763c825dc0e388929ae1b375ce18.eot',
            'd68e763c825dc0e388929ae1b375ce18.ttf',
            'd68e763c825dc0e388929ae1b375ce18.woff',
            'd68e763c825dc0e388929ae1b375ce18.svg',
            'd68e763c825dc0e388929ae1b375ce18.jpg'
          ])
        )
      )
    )
  )
);
