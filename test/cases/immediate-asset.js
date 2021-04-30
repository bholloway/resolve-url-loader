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
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/feature'} --> ${'./src/feature/img.jpg'}
  [ ]+FOUND$
  `;

module.exports = test(
  'immediate-asset',
  layer('immediate-asset')(
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
          single-quoted: url('img.jpg');
          double-quoted: url("img.jpg");
          unquoted: url(img.jpg);
          query: url(img.jpg?query);
          hash: url(img.jpg#hash);
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
        'src/feature/img.jpg': require.resolve('./assets/blank.jpg')
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
            assertCssAndSourceMapContent('main.cbe6b627d5564bfb024575ba57f2cc95.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                           01:1 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('img.jpg');⏎             02:3 ░░single-quoted: url("./feature/img.jpg");⏎  
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("img.jpg");⏎             03:3 ░░double-quoted: url("./feature/img.jpg");⏎  
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(img.jpg);⏎                    04:3 ░░unquoted: url(./feature/img.jpg);⏎         
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(img.jpg?query);⏎                 05:3 ░░query: url(./feature/img.jpg?query);⏎      
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(img.jpg#hash);⏎                   06:3 ░░hash: url(./feature/img.jpg#hash);⏎        
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
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.cbe6b627d5564bfb024
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      575ba57f2cc95.css.map*/░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "rework" && meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.65ffecabae82ac8bc9f0.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                  
            ----------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                           01:1 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('img.jpg');⏎             02:3 ░░single-quoted: url("./feature/img.jpg");⏎  
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("img.jpg");⏎             03:3 ░░double-quoted: url("./feature/img.jpg");⏎  
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(img.jpg);⏎                    04:3 ░░unquoted: url(./feature/img.jpg);⏎         
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(img.jpg?query);⏎                 05:3 ░░query: url(./feature/img.jpg?query);⏎      
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(img.jpg#hash);⏎                   06:3 ░░hash: url(./feature/img.jpg#hash);⏎        
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
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.65ffecabae82ac8bc9f
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      0.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "rework" && meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.fc6aefda8e150b895027.css'),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                           01:1 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('img.jpg');⏎             02:3 ░░single-quoted: url("./feature/img.jpg");⏎  
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("img.jpg");⏎             03:3 ░░double-quoted: url("./feature/img.jpg");⏎  
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(img.jpg);⏎                    04:3 ░░unquoted: url(./feature/img.jpg);⏎         
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(img.jpg?query);⏎                 05:3 ░░query: url(./feature/img.jpg?query);⏎      
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(img.jpg#hash);⏎                   06:3 ░░hash: url(./feature/img.jpg#hash);⏎        
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
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.fc6aefda8e150b89502
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      7.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.7f3d3cdc7ef0fc04f043446f4781a68f.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('img.jpg')░░░░░░░░░░░░░ 2:03 ░░single-quoted: url("./feature/img.jpg");░░
            2:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            2:43 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("img.jpg")░░░░░░░░░░░░░ 3:03 ░░double-quoted: url("./feature/img.jpg");░░
            3:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            3:43 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(img.jpg)░░░░░░░░░░░░░░░░░░░░ 4:03 ░░unquoted: url(./feature/img.jpg);░░░░░░░░░
            4:25 ░░░░░░░░░░░░░░░░░░░░░░░░;⏎                   4:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎        
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(img.jpg?query)░░░░░░░░░░░░░░░░░ 5:03 ░░query: url(./feature/img.jpg?query);░░░░░░
            5:28 ░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎                5:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎     
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(img.jpg#hash)░░░░░░░░░░░░░░░░░░░ 6:03 ░░hash: url(./feature/img.jpg#hash);░░░░░░░░
            6:26 ░░░░░░░░░░░░░░░░░░░░░░░░░;⏎                  6:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ }⏎     
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block;░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:18 ░░░░░░░░░░░░░░░░░ }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.7f3d3cdc7ef0fc04f0
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      43446f4781a68f.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.84b09282b83fd7699c9c.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                 
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('img.jpg')░░░░░░░░░░░░░ 2:03 ░░single-quoted: url("./feature/img.jpg")░░░
            2:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("img.jpg")░░░░░░░░░░░░░ 3:03 ░░double-quoted: url("./feature/img.jpg")░░░
            3:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(img.jpg)░░░░░░░░░░░░░░░░░░░░ 4:03 ░░unquoted: url(./feature/img.jpg)░░░░░░░░░░
            4:25 ░░░░░░░░░░░░░░░░░░░░░░░░;⏎                   4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(img.jpg?query)░░░░░░░░░░░░░░░░░ 5:03 ░░query: url(./feature/img.jpg?query)░░░░░░░
            5:28 ░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎                5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(img.jpg#hash)░░░░░░░░░░░░░░░░░░░ 6:03 ░░hash: url(./feature/img.jpg#hash)░░░░░░░░░
            6:26 ░░░░░░░░░░░░░░░░░░░░░░░░░;⏎                  6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎     
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.84b09282b83fd7699c
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      9c.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.37fc9e8e1d28a3012b75.css'),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('img.jpg')░░░░░░░░░░░░░ 2:03 ░░single-quoted: url("./feature/img.jpg")░░░
            2:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("img.jpg")░░░░░░░░░░░░░ 3:03 ░░double-quoted: url("./feature/img.jpg")░░░
            3:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(img.jpg)░░░░░░░░░░░░░░░░░░░░ 4:03 ░░unquoted: url(./feature/img.jpg)░░░░░░░░░░
            4:25 ░░░░░░░░░░░░░░░░░░░░░░░░;⏎                   4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(img.jpg?query)░░░░░░░░░░░░░░░░░ 5:03 ░░query: url(./feature/img.jpg?query)░░░░░░░
            5:28 ░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎                5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(img.jpg#hash)░░░░░░░░░░░░░░░░░░░ 6:03 ░░hash: url(./feature/img.jpg#hash)░░░░░░░░░
            6:26 ░░░░░░░░░░░░░░░░░░░░░░░░░;⏎                  6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎     
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.37fc9e8e1d28a3012b
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      75.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
            assertCssAndSourceMapContent('main.6f4a37a5c9d41f6beadedaf03bd443ef.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('img.jpg');⏎            1:018 ░░░░░░░░░░░░░░░░░single-quoted:url("./featur
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       e/img.jpg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("img.jpg");⏎            1:057 ░░░░░░░░░░░░double-quoted:url("./feature/img
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       .jpg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(img.jpg);⏎                   1:096 ░░░░░░░unquoted:url(./feature/img.jpg);░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(img.jpg?query);⏎                1:128 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       :url(./feature/img.jpg?query);░░░░░░░░░░░░░░
            6:3 ░░hash: url(img.jpg#hash);⏎                  1:163 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(./fea
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ture/img.jpg#hash)}░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:196 ░░░░░░░░░░░░░░░░░░░.another-class-name{░░░░░
            3:3 ░░display: block;⏎                           1:216 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░displ
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ay:block}⏎                                  
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.6f4a37a5c9d41f6bea
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       dedaf03bd443ef.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "rework" && meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.da49a16ca6294e61cb18.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                 
            ---------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('img.jpg');⏎            1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(feature/i
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('img.jpg');⏎            1:052 ░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("img.jpg");⏎            1:053 ░░░░░░░░double-quoted:url(feature/img.jpg)░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("img.jpg");⏎            1:087 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(img.jpg);⏎                   1:088 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░u
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       nquoted:url(feature/img.jpg)░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(img.jpg);⏎                   1:117 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(img.jpg?query);⏎                1:118 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(featu
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       re/img.jpg?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(img.jpg?query);⏎                1:150 ░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(img.jpg#hash);⏎                  1:151 ░░░░░░░░░░░░░░░░░░hash:url(feature/img.jpg#h
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:181 ░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:1 .another-class-name {⏎                       1:182 ░░░░░.another-class-name{░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░display: block;⏎                           1:202 ░░░░░░░░░░░░░░░░░░░░░░░░░display:block░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:215 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "rework" && meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.3e146ef2f55c386aba8d.css'),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('img.jpg');⏎            1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(feature/i
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('img.jpg');⏎            1:052 ░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("img.jpg");⏎            1:053 ░░░░░░░░double-quoted:url(feature/img.jpg)░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("img.jpg");⏎            1:087 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(img.jpg);⏎                   1:088 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░u
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       nquoted:url(feature/img.jpg)░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(img.jpg);⏎                   1:117 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(img.jpg?query);⏎                1:118 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(featu
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       re/img.jpg?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(img.jpg?query);⏎                1:150 ░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(img.jpg#hash);⏎                  1:151 ░░░░░░░░░░░░░░░░░░hash:url(feature/img.jpg#h
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:181 ░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:1 .another-class-name {⏎                       1:182 ░░░░░.another-class-name{░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░display: block;⏎                           1:202 ░░░░░░░░░░░░░░░░░░░░░░░░░display:block░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:215 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.6f4a37a5c9d41f6beadedaf03bd443ef.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('img.jpg');⏎            1:018 ░░░░░░░░░░░░░░░░░single-quoted:url("./featur
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       e/img.jpg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("img.jpg");⏎            1:057 ░░░░░░░░░░░░double-quoted:url("./feature/img
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       .jpg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(img.jpg);⏎                   1:096 ░░░░░░░unquoted:url(./feature/img.jpg);░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(img.jpg?query);⏎                1:128 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       :url(./feature/img.jpg?query);░░░░░░░░░░░░░░
            6:03 ░░hash: url(img.jpg#hash)░░░░░░░░░░░░░░░░░░░ 1:163 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(./fea
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ture/img.jpg#hash)░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:26 ░░░░░░░░░░░░░░░░░░░░░░░░░;⏎                  1:195 ░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:196 ░░░░░░░░░░░░░░░░░░░.another-class-name{░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:216 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░displ
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ay:block░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:229 ░░░░░░░░}⏎                                  
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.6f4a37a5c9d41f6bea
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       dedaf03bd443ef.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.f158aa080424b0af8962.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                  
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('img.jpg')░░░░░░░░░░░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(feature/i
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            1:052 ░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("img.jpg")░░░░░░░░░░░░░ 1:053 ░░░░░░░░double-quoted:url(feature/img.jpg)░░
            3:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            1:087 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(img.jpg)░░░░░░░░░░░░░░░░░░░░ 1:088 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░u
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       nquoted:url(feature/img.jpg)░░░░░░░░░░░░░░░░
            4:25 ░░░░░░░░░░░░░░░░░░░░░░░░;⏎                   1:117 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(img.jpg?query)░░░░░░░░░░░░░░░░░ 1:118 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(featu
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       re/img.jpg?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:28 ░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎                1:150 ░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(img.jpg#hash)░░░░░░░░░░░░░░░░░░░ 1:151 ░░░░░░░░░░░░░░░░░░hash:url(feature/img.jpg#h
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:26 ░░░░░░░░░░░░░░░░░░░░░░░░░;⏎                  1:181 ░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            index.scss                                                                                          
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:182 ░░░░░.another-class-name{░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:202 ░░░░░░░░░░░░░░░░░░░░░░░░░display:block░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:215 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
           `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.3e146ef2f55c386aba8d.css'),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('img.jpg')░░░░░░░░░░░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(feature/i
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            1:052 ░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("img.jpg")░░░░░░░░░░░░░ 1:053 ░░░░░░░░double-quoted:url(feature/img.jpg)░░
            3:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎            1:087 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(img.jpg)░░░░░░░░░░░░░░░░░░░░ 1:088 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░u
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       nquoted:url(feature/img.jpg)░░░░░░░░░░░░░░░░
            4:25 ░░░░░░░░░░░░░░░░░░░░░░░░;⏎                   1:117 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(img.jpg?query)░░░░░░░░░░░░░░░░░ 1:118 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(featu
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       re/img.jpg?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:28 ░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎                1:150 ░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(img.jpg#hash)░░░░░░░░░░░░░░░░░░░ 1:151 ░░░░░░░░░░░░░░░░░░hash:url(feature/img.jpg#h
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:26 ░░░░░░░░░░░░░░░░░░░░░░░░░;⏎                  1:181 ░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/index.scss                                                                                     
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
