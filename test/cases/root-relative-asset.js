'use strict';

const {join} = require('path');
const outdent = require('outdent');
const compose = require('compose-function');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('../lib/util');
const {rebaseToCache} = require('../lib/higher-order');
const {all, testDefault, testDebug, testRoot, testWithLabel} = require('./common/test');
const {
  buildDevNormal, buildDevNoUrl, buildProdNormal, buildProdNoUrl, buildProdNoDevtool
} = require('./common/exec');
const {assertCssAndSourceMapContent} = require('./common/assert');
const {assertCssContent} = require('../lib/assert');
const {
  onlyMeta, assertWebpackOk, assertWebpackNotOk, assertNoErrors, assertNoMessages, assertStdout,
  assertCssSourceMapComment, assertCssFile, assertSourceMapFile, assertAssetError
} = require('../lib/assert');

const assertDebugMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'/images/img.jpg'}
  [ ]+${'.'} --> ${'./images/img.jpg'}
  [ ]+FOUND$
  `;

module.exports = test(
  'root-relative-asset',
  layer('root-relative-asset')(
    cwd('.'),
    fs({
      'package.json': rebaseToCache('package.json'),
      'webpack.config.js': rebaseToCache('webpack.config.js'),
      'node_modules': rebaseToCache('node_modules'),
      'src/index.scss': outdent`
        @import "feature/index.scss";
        .another-class-name {
          display: block;
        }
        `,
      'src/feature/index.scss': outdent`
        .some-class-name {
          single-quoted: url('/images/img.jpg');
          double-quoted: url("/images/img.jpg");
          unquoted: url(/images/img.jpg);
          query: url(/images/img.jpg?query);
          hash: url(/images/img.jpg#hash);
        }
        `
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testWithLabel('asset-missing')(
      all(testRoot(false), testRoot(true))(
        all(buildDevNormal, buildProdNormal)(
          assertWebpackNotOk,
          assertAssetError
        ),
        all(buildDevNoUrl, buildProdNoUrl)(
          assertWebpackOk
        )
      )
    ),
    testWithLabel('asset-present')(
      cwd('.'),
      fs({
        'images/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      // root-relative urls are processed
      testRoot(true)(
        testDebug(
          buildDevNormal(
            assertWebpackOk,
            assertNoErrors,
            assertDebugMessages,
            assertCssSourceMapComment(true),
            compose(assertCssContent, outdent)`
              .some-class-name {
                single-quoted: url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
                double-quoted: url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
                unquoted: url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
                query: url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
                hash: url(9eb57a84abbf8abc636d0faa71f9a800.jpg#hash); }
              
              .another-class-name {
                display: block; }
              `
          ),
          buildDevNoUrl(
            assertWebpackOk,
            assertNoErrors,
            assertDebugMessages,
            assertCssSourceMapComment(true),
            compose(
              onlyMeta('meta.version.webpack == 4'),
              assertCssAndSourceMapContent(),
              outdent
            )`
              ./src/feature/index.scss                                                                           
              ---------------------------------------------------------------------------------------------------
              1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:03 ░░single-quoted: url('/images/img.jpg')░░░░░ 2:03 ░░single-quoted: url("../images/img.jpg")░░░
              2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░double-quoted: url("/images/img.jpg")░░░░░ 3:03 ░░double-quoted: url("../images/img.jpg")░░░
              3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:03 ░░unquoted: url(/images/img.jpg)░░░░░░░░░░░░ 4:03 ░░unquoted: url(../images/img.jpg)░░░░░░░░░░
              4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              5:03 ░░query: url(/images/img.jpg?query)░░░░░░░░░ 5:03 ░░query: url(../images/img.jpg?query)░░░░░░░
              5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:03 ░░hash: url(/images/img.jpg#hash)░░░░░░░░░░░ 6:03 ░░hash: url(../images/img.jpg#hash)░░░░░░░░░
              6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎     
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                 
              ./src/index.scss                                                                                   
              ---------------------------------------------------------------------------------------------------
              2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.□□□□□□□□□□□□□□□□□□
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      □□.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              `,
            compose(
              onlyMeta('meta.version.webpack >= 5'),
              assertCssAndSourceMapContent(),
              outdent
            )`
              ./src/feature/index.scss                                                                           
              ---------------------------------------------------------------------------------------------------
              1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:03 ░░single-quoted: url('/images/img.jpg')░░░░░ 2:03 ░░single-quoted: url("../images/img.jpg")░░░
              2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░double-quoted: url("/images/img.jpg")░░░░░ 3:03 ░░double-quoted: url("../images/img.jpg")░░░
              3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:03 ░░unquoted: url(/images/img.jpg)░░░░░░░░░░░░ 4:03 ░░unquoted: url(../images/img.jpg)░░░░░░░░░░
              4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              5:03 ░░query: url(/images/img.jpg?query)░░░░░░░░░ 5:03 ░░query: url(../images/img.jpg?query)░░░░░░░
              5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:03 ░░hash: url(/images/img.jpg#hash)░░░░░░░░░░░ 6:03 ░░hash: url(../images/img.jpg#hash)░░░░░░░░░
              6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎     
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                 
              ./src/index.scss                                                                                   
              ---------------------------------------------------------------------------------------------------
              2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.□□□□□□□□□□□□□□□□□□
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      □□.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              `
          ),
          buildProdNormal(
            assertWebpackOk,
            assertNoErrors,
            assertDebugMessages,
            assertCssSourceMapComment(false),
            compose(assertCssContent, trim)`
              .some-class-name{single-quoted:url(9eb57a84abbf8abc636d0faa71f9a800.jpg);double-quoted:
              url(9eb57a84abbf8abc636d0faa71f9a800.jpg);unquoted:url(9eb57a84abbf8abc636d0faa71f9a800.jpg);query:
              url(9eb57a84abbf8abc636d0faa71f9a800.jpg);hash:url(9eb57a84abbf8abc636d0faa71f9a800.jpg#hash)}
              .another-class-name{display:block}
              `
          ),
          buildProdNoUrl(
            assertWebpackOk,
            assertNoErrors,
            assertDebugMessages,
            assertCssSourceMapComment(false),
            compose(
              onlyMeta('meta.version.webpack == 4'),
              assertCssAndSourceMapContent(),
              outdent
            )`
              ./src/feature/index.scss                                                                            
              ----------------------------------------------------------------------------------------------------
              1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:03 ░░single-quoted: url('/images/img.jpg')░░░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(../images
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    1:054 ░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░double-quoted: url("/images/img.jpg")░░░░░ 1:055 ░░░░░░░░░░double-quoted:url(../images/img.jp
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       g)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    1:091 ░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:03 ░░unquoted: url(/images/img.jpg)░░░░░░░░░░░░ 1:092 ░░░unquoted:url(../images/img.jpg)░░░░░░░░░░
              4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           1:123 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              5:03 ░░query: url(/images/img.jpg?query)░░░░░░░░░ 1:124 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       (../images/img.jpg?query)░░░░░░░░░░░░░░░░░░░
              5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:158 ░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:03 ░░hash: url(/images/img.jpg#hash)░░░░░░░░░░░ 1:159 ░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(../images
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /img.jpg#hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          1:191 ░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                  
              ./src/index.scss                                                                                    
              ----------------------------------------------------------------------------------------------------
              2:01 .another-class-name {⏎                       1:192 ░░░░░░░░░░░░░░░.another-class-name{░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:212 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░display:b
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       lock░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:17 ░░░░░░░░░░░░░░░░;⏎                           1:225 ░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              `,
            compose(
              onlyMeta('meta.version.webpack >= 5'),
              assertCssAndSourceMapContent(),
              outdent
            )`
              ./src/feature/index.scss                                                                            
              ----------------------------------------------------------------------------------------------------
              1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:03 ░░single-quoted: url('/images/img.jpg')░░░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(../images
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    1:054 ░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░double-quoted: url("/images/img.jpg")░░░░░ 1:055 ░░░░░░░░░░double-quoted:url(../images/img.jp
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       g)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    1:091 ░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:03 ░░unquoted: url(/images/img.jpg)░░░░░░░░░░░░ 1:092 ░░░unquoted:url(../images/img.jpg)░░░░░░░░░░
              4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           1:123 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              5:03 ░░query: url(/images/img.jpg?query)░░░░░░░░░ 1:124 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       (../images/img.jpg?query)░░░░░░░░░░░░░░░░░░░
              5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:158 ░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:03 ░░hash: url(/images/img.jpg#hash)░░░░░░░░░░░ 1:159 ░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(../images
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /img.jpg#hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          1:191 ░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                  
              ./src/index.scss                                                                                    
              ----------------------------------------------------------------------------------------------------
              2:01 .another-class-name {⏎                       1:192 ░░░░░░░░░░░░░░░.another-class-name{░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:212 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░display:b
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       lock░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:17 ░░░░░░░░░░░░░░░░;⏎                           1:225 ░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              `
          ),
          buildProdNoDevtool(
            assertWebpackOk,
            assertNoErrors,
            assertDebugMessages,
            assertCssFile(true),
            assertCssSourceMapComment(false),
            assertSourceMapFile(false)
          )
        ),
        // ensure build passes but don't bother with detailed assertions
        // ensure no debug messages in normal mode
        testDefault(
          all(buildDevNormal, buildDevNoUrl, buildProdNormal, buildProdNoUrl, buildProdNoDevtool)(
            assertWebpackOk,
            assertNoErrors,
            assertNoMessages
          )
        )
      )
    )
  )
);
