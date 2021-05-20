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
  ^resolve-url-loader:[^:]+:[ ]*${'images/img.jpg'}
  [ ]+${'./src/feature'} --> ${'./src/feature/images/img.jpg'}
  [ ]+FOUND$
  `;

module.exports = test(
  'deep-asset',
  layer('deep-asset')(
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
        'src/feature/images/img.jpg': require.resolve('./assets/blank.jpg')
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
            assertCssAndSourceMapContent('main.920e56b7953ed8b47ba6.css'),
            outdent
          )`
            ./src/feature/index.scss                                                                           
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('images/img.jpg')░░░░░░ 2:03 ░░single-quoted: url("./feature/images/img.j
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      pg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     2:49 ░░░░;⏎                                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("images/img.jpg")░░░░░░ 3:03 ░░double-quoted: url("./feature/images/img.j
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      pg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     3:49 ░░░░;⏎                                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(images/img.jpg)░░░░░░░░░░░░░ 4:03 ░░unquoted: url(./feature/images/img.jpg)░░░
            4:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            4:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(images/img.jpg?query)░░░░░░░░░░ 5:03 ░░query: url(./feature/images/img.jpg?query)
            5:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         5:45 ;⏎                                          
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(images/img.jpg#hash)░░░░░░░░░░░░ 6:03 ░░hash: url(./feature/images/img.jpg#hash)░░
            6:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           6:43 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; 
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      }⏎                                          
                                                                                                               
            ./src/index.scss                                                                                   
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.920e56b7953ed8b47b
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      a6.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.a30313feda4d0facbd86.css'),
            outdent
          )`
            ./src/feature/index.scss                                                                           
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('images/img.jpg')░░░░░░ 2:03 ░░single-quoted: url("./feature/images/img.j
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      pg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     2:49 ░░░░;⏎                                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("images/img.jpg")░░░░░░ 3:03 ░░double-quoted: url("./feature/images/img.j
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      pg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     3:49 ░░░░;⏎                                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(images/img.jpg)░░░░░░░░░░░░░ 4:03 ░░unquoted: url(./feature/images/img.jpg)░░░
            4:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            4:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(images/img.jpg?query)░░░░░░░░░░ 5:03 ░░query: url(./feature/images/img.jpg?query)
            5:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         5:45 ;⏎                                          
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(images/img.jpg#hash)░░░░░░░░░░░░ 6:03 ░░hash: url(./feature/images/img.jpg#hash)░░
            6:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           6:43 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; 
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      }⏎                                          
                                                                                                               
            ./src/index.scss                                                                                   
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.a30313feda4d0facbd
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      86.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
            assertCssAndSourceMapContent('main.719def92d65dc07106e6.css'),
            outdent
          )`
            ./src/feature/index.scss                                                                            
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('images/img.jpg')░░░░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(feature/i
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mages/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     1:059 ░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("images/img.jpg")░░░░░░ 1:060 ░░░░░░░░░░░░░░░double-quoted:url(feature/ima
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ges/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     1:101 ░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(images/img.jpg)░░░░░░░░░░░░░ 1:102 ░░░░░░░░░░░░░unquoted:url(feature/images/img
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       .jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            1:138 ░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(images/img.jpg?query)░░░░░░░░░░ 1:139 ░░░░░░query:url(feature/images/img.jpg?query
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       )░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:178 ░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(images/img.jpg#hash)░░░░░░░░░░░░ 1:179 ░░hash:url(feature/images/img.jpg#hash)░░░░░
            6:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           1:216 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:217 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.ano
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ther-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:237 ░░░░░░░░░░░░░░░░display:block░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:250 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.aa2eec7d288de5858a28.css'),
            outdent
          )`
            ./src/feature/index.scss                                                                            
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('images/img.jpg')░░░░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(feature/i
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mages/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     1:059 ░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("images/img.jpg")░░░░░░ 1:060 ░░░░░░░░░░░░░░░double-quoted:url(feature/ima
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ges/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     1:101 ░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(images/img.jpg)░░░░░░░░░░░░░ 1:102 ░░░░░░░░░░░░░unquoted:url(feature/images/img
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       .jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            1:138 ░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(images/img.jpg?query)░░░░░░░░░░ 1:139 ░░░░░░query:url(feature/images/img.jpg?query
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       )░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:178 ░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(images/img.jpg#hash)░░░░░░░░░░░░ 1:179 ░░hash:url(feature/images/img.jpg#hash)░░░░░
            6:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           1:216 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:217 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.ano
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ther-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:237 ░░░░░░░░░░░░░░░░display:block░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:250 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░
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
