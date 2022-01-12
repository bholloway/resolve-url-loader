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
  assertWebpackOk, assertWebpackNotOk, assertNoErrors, assertNoMessages,
  assertCssSourceMapComment, assertCssFile, assertSourceMapFile, assertAssetError
} = require('../lib/assert');

module.exports = test(
  'module-relative-asset',
  layer('module-relative-asset')(
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
          single-quoted: url('~images/img.jpg');
          double-quoted: url("~images/img.jpg");
          unquoted: url(~images/img.jpg);
          query: url(~images/img.jpg?query);
          hash: url(~images/img.jpg#hash);
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
      cwd('.'),
      fs({
        'modules/images/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
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
          assertNoMessages,
          assertCssSourceMapComment(true),
          compose(
            assertCssAndSourceMapContent(),
            outdent
          )`
            ./src/feature/index.scss                                                                           
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('~images/img.jpg')░░░░░ 2:03 ░░single-quoted: url("~images/img.jpg")░░░░░
            2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎   
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("~images/img.jpg")░░░░░ 3:03 ░░double-quoted: url("~images/img.jpg")░░░░░
            3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎   
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(~images/img.jpg)░░░░░░░░░░░░ 4:03 ░░unquoted: url(~images/img.jpg)░░░░░░░░░░░░
            4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(~images/img.jpg?query)░░░░░░░░░ 5:03 ░░query: url(~images/img.jpg?query)░░░░░░░░░
            5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎       
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(~images/img.jpg#hash)░░░░░░░░░░░ 6:03 ░░hash: url(~images/img.jpg#hash)░░░░░░░░░░░
            6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎       
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
          assertNoMessages,
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
          assertNoMessages,
          assertCssSourceMapComment(false),
          compose(
            assertCssAndSourceMapContent(),
            outdent
          )`
            ./src/feature/index.scss                                                                            
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('~images/img.jpg')░░░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(~images/i
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    1:052 ░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("~images/img.jpg")░░░░░ 1:053 ░░░░░░░░double-quoted:url(~images/img.jpg)░░
            3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    1:087 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(~images/img.jpg)░░░░░░░░░░░░ 1:088 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░u
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       nquoted:url(~images/img.jpg)░░░░░░░░░░░░░░░░
            4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           1:117 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(~images/img.jpg?query)░░░░░░░░░ 1:118 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(~imag
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       es/img.jpg?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:150 ░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(~images/img.jpg#hash)░░░░░░░░░░░ 1:151 ░░░░░░░░░░░░░░░░░░hash:url(~images/img.jpg#h
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          1:181 ░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:182 ░░░░░.another-class-name{░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:202 ░░░░░░░░░░░░░░░░░░░░░░░░░display:block░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:215 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
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
