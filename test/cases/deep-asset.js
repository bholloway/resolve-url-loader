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
          compose(onlyMeta('meta.engine == "rework" && meta.version.webpack < 5'), assertCssContent, outdent)`
            .some-class-name {
              single-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              double-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              unquoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              query: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              hash: url(d68e763c825dc0e388929ae1b375ce18.jpg#hash);
            }
            
            .another-class-name {
              display: block;
            }
            `,
          compose(onlyMeta('meta.engine == "rework" && meta.version.webpack >= 5'), assertCssContent, outdent)`
            .some-class-name {
              single-quoted: url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
              double-quoted: url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
              unquoted: url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
              query: url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
              hash: url(9eb57a84abbf8abc636d0faa71f9a800.jpg#hash);
            }
            
            .another-class-name {
              display: block;
            }
            `,
          compose(onlyMeta('meta.engine == "postcss" && meta.version.webpack < 5'), assertCssContent, outdent)`
            .some-class-name {
              single-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              double-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              unquoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              query: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              hash: url(d68e763c825dc0e388929ae1b375ce18.jpg#hash); }
            
            .another-class-name {
              display: block; }
            `,
          compose(onlyMeta('meta.engine == "postcss" && meta.version.webpack >= 5'), assertCssContent, outdent)`
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
            onlyMeta('meta.engine == "rework" && meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.b2b2089e220f45d1a2686d0117aa69aa.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                           01:1 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('images/img.jpg');⏎      02:3 ░░single-quoted: url("./feature/images/img.jp
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g");⏎                                        
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("images/img.jpg");⏎      03:3 ░░double-quoted: url("./feature/images/img.jp
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g");⏎                                        
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(images/img.jpg);⏎             04:3 ░░unquoted: url(./feature/images/img.jpg);⏎  
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(images/img.jpg?query);⏎          05:3 ░░query: url(./feature/images/img.jpg?query);
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(images/img.jpg#hash);⏎            06:3 ░░hash: url(./feature/images/img.jpg#hash);⏎ 
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 07:2 ░⏎                                           
            2:1 .another-class-name {⏎                        09:1 .another-class-name {⏎                       
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░display: block;⏎                            10:3 ░░display: block;⏎                           
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 11:2 ░⏎                                           
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.b2b2089e220f45d1a26
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      86d0117aa69aa.css.map*/░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "rework" && meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.5e0dd93fdc2c2f768a45.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                  
            ----------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                           01:1 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('images/img.jpg');⏎      02:3 ░░single-quoted: url("./feature/images/img.jp
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g");⏎                                        
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("images/img.jpg");⏎      03:3 ░░double-quoted: url("./feature/images/img.jp
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g");⏎                                        
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(images/img.jpg);⏎             04:3 ░░unquoted: url(./feature/images/img.jpg);⏎  
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(images/img.jpg?query);⏎          05:3 ░░query: url(./feature/images/img.jpg?query);
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(images/img.jpg#hash);⏎            06:3 ░░hash: url(./feature/images/img.jpg#hash);⏎ 
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            index.scss                                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 07:1 }⏎                                           
            2:1 .another-class-name {⏎                        09:1 .another-class-name {⏎                       
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░display: block;⏎                            10:3 ░░display: block;⏎                           
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 11:1 }⏎                                           
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.5e0dd93fdc2c2f768a4
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      5.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "rework" && meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.31ac44fb765669424307.css'),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                           01:1 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('images/img.jpg');⏎      02:3 ░░single-quoted: url("./feature/images/img.jp
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g");⏎                                        
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("images/img.jpg");⏎      03:3 ░░double-quoted: url("./feature/images/img.jp
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g");⏎                                        
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(images/img.jpg);⏎             04:3 ░░unquoted: url(./feature/images/img.jpg);⏎  
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(images/img.jpg?query);⏎          05:3 ░░query: url(./feature/images/img.jpg?query);
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(images/img.jpg#hash);⏎            06:3 ░░hash: url(./feature/images/img.jpg#hash);⏎ 
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 07:1 }⏎                                           
            2:1 .another-class-name {⏎                        09:1 .another-class-name {⏎                       
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░display: block;⏎                            10:3 ░░display: block;⏎                           
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 11:1 }⏎                                           
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.31ac44fb76566942430
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      7.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.5783f4340e7af1339e5c373eddccf34d.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('images/img.jpg')░░░░░░ 2:03 ░░single-quoted: url("./feature/images/img.j
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      pg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     2:50 ░░░░░⏎                                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("images/img.jpg")░░░░░░ 3:03 ░░double-quoted: url("./feature/images/img.j
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      pg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     3:50 ░░░░░⏎                                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(images/img.jpg)░░░░░░░░░░░░░ 4:03 ░░unquoted: url(./feature/images/img.jpg);░░
            4:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            4:43 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(images/img.jpg?query)░░░░░░░░░░ 5:03 ░░query: url(./feature/images/img.jpg?query)
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         5:46 ░⏎                                          
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(images/img.jpg#hash)░░░░░░░░░░░░ 6:03 ░░hash: url(./feature/images/img.jpg#hash);░
            6:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           6:44 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      }⏎                                          
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block;░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:18 ░░░░░░░░░░░░░░░░░ }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.5783f4340e7af1339e
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      5c373eddccf34d.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.d0c3e9eeed585fb4ae81.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                 
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
                                                                                                               
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.d0c3e9eeed585fb4ae
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      81.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.a30313feda4d0facbd86.css'),
            outdent
          )`
            /src/feature/index.scss                                                                            
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
                                                                                                               
            /src/index.scss                                                                                    
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
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(onlyMeta('meta.version.webpack < 5'), assertCssContent, trim)`
            .some-class-name{single-quoted:url(d68e763c825dc0e388929ae1b375ce18.jpg);double-quoted:
            url(d68e763c825dc0e388929ae1b375ce18.jpg);unquoted:url(d68e763c825dc0e388929ae1b375ce18.jpg);query:
            url(d68e763c825dc0e388929ae1b375ce18.jpg);hash:url(d68e763c825dc0e388929ae1b375ce18.jpg#hash)}
            .another-class-name{display:block}
            `,
          compose(onlyMeta('meta.version.webpack >= 5'), assertCssContent, trim)`
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
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(
            onlyMeta('meta.engine == "rework" && meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.ad93e9ebdc2de228afe75ffa82aec99c.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('images/img.jpg');⏎     1:018 ░░░░░░░░░░░░░░░░░single-quoted:url("./featur
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       e/images/img.jpg");░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("images/img.jpg");⏎     1:064 ░░░░░░░░░░░░░░░░░░░double-quoted:url("./feat
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ure/images/img.jpg");░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(images/img.jpg);⏎            1:110 ░░░░░░░░░░░░░░░░░░░░░unquoted:url(./feature/
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       images/img.jpg);░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(images/img.jpg?query);⏎         1:149 ░░░░░░░░░░░░░░░░query:url(./feature/images/i
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg?query);░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(images/img.jpg#hash);⏎           1:191 ░░░░░░░░░░░░░░hash:url(./feature/images/img.
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       jpg#hash)}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:231 ░░░░░░░░░░.another-class-name{░░░░░░░░░░░░░░
            3:3 ░░display: block;⏎                           1:251 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░display:block}
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ⏎                                           
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.ad93e9ebdc2de228af
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       e75ffa82aec99c.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "rework" && meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.5b701848330d6004087b.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                 
            ---------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('images/img.jpg');⏎     1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(feature/i
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mages/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('images/img.jpg');⏎     1:059 ░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("images/img.jpg");⏎     1:060 ░░░░░░░░░░░░░░░double-quoted:url(feature/ima
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ges/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("images/img.jpg");⏎     1:101 ░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(images/img.jpg);⏎            1:102 ░░░░░░░░░░░░░unquoted:url(feature/images/img
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       .jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(images/img.jpg);⏎            1:138 ░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(images/img.jpg?query);⏎         1:139 ░░░░░░query:url(feature/images/img.jpg?query
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       )░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(images/img.jpg?query);⏎         1:178 ░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(images/img.jpg#hash);⏎           1:179 ░░hash:url(feature/images/img.jpg#hash)░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:216 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░
            2:1 .another-class-name {⏎                       1:217 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.ano
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ther-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░display: block;⏎                           1:237 ░░░░░░░░░░░░░░░░display:block░░░░░░░░░░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:250 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "rework" && meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.aa2eec7d288de5858a28.css'),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('images/img.jpg');⏎     1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(feature/i
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mages/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('images/img.jpg');⏎     1:059 ░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("images/img.jpg");⏎     1:060 ░░░░░░░░░░░░░░░double-quoted:url(feature/ima
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ges/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("images/img.jpg");⏎     1:101 ░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(images/img.jpg);⏎            1:102 ░░░░░░░░░░░░░unquoted:url(feature/images/img
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       .jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(images/img.jpg);⏎            1:138 ░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(images/img.jpg?query);⏎         1:139 ░░░░░░query:url(feature/images/img.jpg?query
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       )░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(images/img.jpg?query);⏎         1:178 ░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(images/img.jpg#hash);⏎           1:179 ░░hash:url(feature/images/img.jpg#hash)░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:216 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░
            2:1 .another-class-name {⏎                       1:217 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.ano
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ther-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░display: block;⏎                           1:237 ░░░░░░░░░░░░░░░░display:block░░░░░░░░░░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:250 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.ad93e9ebdc2de228afe75ffa82aec99c.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('images/img.jpg');⏎     1:018 ░░░░░░░░░░░░░░░░░single-quoted:url("./featur
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       e/images/img.jpg");░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("images/img.jpg");⏎     1:064 ░░░░░░░░░░░░░░░░░░░double-quoted:url("./feat
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ure/images/img.jpg");░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(images/img.jpg);⏎            1:110 ░░░░░░░░░░░░░░░░░░░░░unquoted:url(./feature/
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       images/img.jpg);░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(images/img.jpg?query);⏎         1:149 ░░░░░░░░░░░░░░░░query:url(./feature/images/i
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg?query);░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(images/img.jpg#hash)░░░░░░░░░░░░ 1:191 ░░░░░░░░░░░░░░hash:url(./feature/images/img.
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       jpg#hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           1:230 ░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:231 ░░░░░░░░░░.another-class-name{░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:251 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░display:block░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:264 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.ad93e9ebdc2de228af
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       e75ffa82aec99c.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.8a72993acfa0760768e9.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                  
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
                                                                                                                
            index.scss                                                                                          
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:217 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.ano
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ther-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:237 ░░░░░░░░░░░░░░░░display:block░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:250 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.aa2eec7d288de5858a28.css'),
            outdent
          )`
            /src/feature/index.scss                                                                             
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
                                                                                                                
            /src/index.scss                                                                                     
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
