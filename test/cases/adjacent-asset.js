'use strict';

const {join} = require('path');
const outdent = require('outdent');
const compose = require('compose-function');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('../lib/util');
const {rebaseToCache} = require('../lib/higher-order');
const {all, testDefault, testDebug, testWithLabel} = require('./common/test');
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
  ^resolve-url-loader:[^:]+:[ ]*${'../../../packageB/images/img.jpg'}
  [ ]+${'./src/feature'} --> ${'../packageB/images/img.jpg'}
  [ ]+FOUND$
  `;

module.exports = test(
  'adjacent-asset',
  layer('adjacent-asset')(
    cwd('packageA'),
    fs({
      'packageA/package.json': rebaseToCache('package.json'),
      'packageA/webpack.config.js': rebaseToCache('webpack.config.js'),
      'packageA/node_modules': rebaseToCache('node_modules'),
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
        `
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testWithLabel('asset-missing')(
      all(buildDevNormal, buildProdNormal)(
        assertWebpackNotOk,
        assertAssetError
      ),
      all(buildDevNoUrl, buildProdNoUrl)(
        assertWebpackOk
      )
    ),
    testWithLabel('asset-present')(
      cwd('packageA'),
      fs({
        'packageB/package.json': `{ "name": "packageB" }`,
        'packageB/images/img.jpg': require.resolve('./assets/blank.jpg')
      }),
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
            2:03 ░░single-quoted: url('../../../packageB/imag 2:03 ░░single-quoted: url("../../packageB/images/
                 es/img.jpg')░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      img.jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:57 ░░░░░░░░░░░░;⏎                               2:54 ░░░░░░░░░;⏎                                 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("../../../packageB/imag 3:03 ░░double-quoted: url("../../packageB/images/
                 es/img.jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      img.jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:57 ░░░░░░░░░░░░;⏎                               3:54 ░░░░░░░░░;⏎                                 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(../../../packageB/images/img 4:03 ░░unquoted: url(../../packageB/images/img.jp
                 .jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:50 ░░░░░;⏎                                      4:47 ░░;⏎                                        
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(../../../packageB/images/img.jp 5:03 ░░query: url(../../packageB/images/img.jpg?q
                 g?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      uery)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:53 ░░░░░░░░;⏎                                   5:50 ░░░░░;⏎                                     
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(../../../packageB/images/img.jpg 6:03 ░░hash: url(../../packageB/images/img.jpg#ha
                 #hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      sh)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:51 ░░░░░░;⏎                                     6:48 ░░░; }⏎                                     
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
            2:03 ░░single-quoted: url('../../../packageB/imag 2:03 ░░single-quoted: url("../../packageB/images/
                 es/img.jpg')░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      img.jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:57 ░░░░░░░░░░░░;⏎                               2:54 ░░░░░░░░░;⏎                                 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("../../../packageB/imag 3:03 ░░double-quoted: url("../../packageB/images/
                 es/img.jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      img.jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:57 ░░░░░░░░░░░░;⏎                               3:54 ░░░░░░░░░;⏎                                 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(../../../packageB/images/img 4:03 ░░unquoted: url(../../packageB/images/img.jp
                 .jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:50 ░░░░░;⏎                                      4:47 ░░;⏎                                        
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(../../../packageB/images/img.jp 5:03 ░░query: url(../../packageB/images/img.jpg?q
                 g?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      uery)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:53 ░░░░░░░░;⏎                                   5:50 ░░░░░;⏎                                     
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(../../../packageB/images/img.jpg 6:03 ░░hash: url(../../packageB/images/img.jpg#ha
                 #hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      sh)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:51 ░░░░░░;⏎                                     6:48 ░░░; }⏎                                     
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
            2:03 ░░single-quoted: url('../../../packageB/imag 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(../../pac
                 es/img.jpg')░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       kageB/images/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░
            2:57 ░░░░░░░░░░░░;⏎                               1:066 ░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("../../../packageB/imag 1:067 ░░░░░░░░░░░░░░░░░░░░░░double-quoted:url(../.
                 es/img.jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ./packageB/images/img.jpg)░░░░░░░░░░░░░░░░░░
            3:57 ░░░░░░░░░░░░;⏎                               1:115 ░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(../../../packageB/images/img 1:116 ░░░░░░░░░░░░░░░░░░░░░░░░░░░unquoted:url(../.
                 .jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ./packageB/images/img.jpg)░░░░░░░░░░░░░░░░░░
            4:50 ░░░░░;⏎                                      1:159 ░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(../../../packageB/images/img.jp 1:160 ░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(../../p
                 g?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ackageB/images/img.jpg?query)░░░░░░░░░░░░░░░
            5:53 ░░░░░░░░;⏎                                   1:206 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(../../../packageB/images/img.jpg 1:207 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(../..
                 #hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /packageB/images/img.jpg#hash)░░░░░░░░░░░░░░
            6:51 ░░░░░░;⏎                                     1:251 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:252 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.another-clas
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       s-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:272 ░░░░░░░display:block░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:285 ░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░
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
            2:03 ░░single-quoted: url('../../../packageB/imag 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(../../pac
                 es/img.jpg')░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       kageB/images/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░
            2:57 ░░░░░░░░░░░░;⏎                               1:066 ░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("../../../packageB/imag 1:067 ░░░░░░░░░░░░░░░░░░░░░░double-quoted:url(../.
                 es/img.jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ./packageB/images/img.jpg)░░░░░░░░░░░░░░░░░░
            3:57 ░░░░░░░░░░░░;⏎                               1:115 ░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(../../../packageB/images/img 1:116 ░░░░░░░░░░░░░░░░░░░░░░░░░░░unquoted:url(../.
                 .jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ./packageB/images/img.jpg)░░░░░░░░░░░░░░░░░░
            4:50 ░░░░░;⏎                                      1:159 ░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(../../../packageB/images/img.jp 1:160 ░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(../../p
                 g?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ackageB/images/img.jpg?query)░░░░░░░░░░░░░░░
            5:53 ░░░░░░░░;⏎                                   1:206 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(../../../packageB/images/img.jpg 1:207 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(../..
                 #hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /packageB/images/img.jpg#hash)░░░░░░░░░░░░░░
            6:51 ░░░░░░;⏎                                     1:251 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:252 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.another-clas
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       s-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:272 ░░░░░░░display:block░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:285 ░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░
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
);
