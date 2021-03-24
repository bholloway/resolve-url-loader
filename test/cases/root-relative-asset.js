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
      // root-relative urls are not processed
      testRoot(false)(
        all(buildDevNormal, buildProdNormal)(
          onlyMeta('meta.version.webpack < 5')(
            assertWebpackOk
          ),
          onlyMeta('meta.version.webpack >= 5')(
            assertWebpackNotOk
          )
        ),
        all(buildDevNoUrl, buildProdNoUrl)(
          assertWebpackOk
        )
      ),
      // root-relative urls are processed
      testRoot(true)(
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
              assertCssAndSourceMapContent('main.a179b04590885bbf990aa89922474d53.css', {sanitiseSources: true}),
              outdent
            )`
              /src/feature/index.scss                                                                             
              ----------------------------------------------------------------------------------------------------
              1:1 .some-class-name {⏎                           01:1 .some-class-name {⏎                          
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:3 ░░single-quoted: url('/images/img.jpg');⏎     02:3 ░░single-quoted: url("../images/img.jpg");⏎  
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:3 ░░double-quoted: url("/images/img.jpg");⏎     03:3 ░░double-quoted: url("../images/img.jpg");⏎  
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:3 ░░unquoted: url(/images/img.jpg);⏎            04:3 ░░unquoted: url(../images/img.jpg);⏎         
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              5:3 ░░query: url(/images/img.jpg?query);⏎         05:3 ░░query: url(../images/img.jpg?query);⏎      
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:3 ░░hash: url(/images/img.jpg#hash);⏎           06:3 ░░hash: url(../images/img.jpg#hash);⏎        
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
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.a179b04590885bbf990
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      aa89922474d53.css.map*/░░░░░░░░░░░░░░░░░░░░░░
              `,
            compose(
              onlyMeta('meta.engine == "rework" && meta.version.webpack == 4'),
              assertCssAndSourceMapContent('main.54b0365e982ff2061362.css', {sourceRoot: 'src'}),
              outdent
            )`
              feature/index.scss                                                                                  
              ----------------------------------------------------------------------------------------------------
              1:1 .some-class-name {⏎                           01:1 .some-class-name {⏎                          
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:3 ░░single-quoted: url('/images/img.jpg');⏎     02:3 ░░single-quoted: url("../images/img.jpg");⏎  
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:3 ░░double-quoted: url("/images/img.jpg");⏎     03:3 ░░double-quoted: url("../images/img.jpg");⏎  
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:3 ░░unquoted: url(/images/img.jpg);⏎            04:3 ░░unquoted: url(../images/img.jpg);⏎         
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              5:3 ░░query: url(/images/img.jpg?query);⏎         05:3 ░░query: url(../images/img.jpg?query);⏎      
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:3 ░░hash: url(/images/img.jpg#hash);⏎           06:3 ░░hash: url(../images/img.jpg#hash);⏎        
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
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.54b0365e982ff206136
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      2.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              `,
            compose(
              onlyMeta('meta.engine == "rework" && meta.version.webpack >= 5'),
              assertCssAndSourceMapContent('main.f4c290f1d74cb2b8c4a0.css'),
              outdent
            )`
              /src/feature/index.scss                                                                             
              ----------------------------------------------------------------------------------------------------
              1:1 .some-class-name {⏎                           01:1 .some-class-name {⏎                          
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:3 ░░single-quoted: url('/images/img.jpg');⏎     02:3 ░░single-quoted: url("../images/img.jpg");⏎  
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:3 ░░double-quoted: url("/images/img.jpg");⏎     03:3 ░░double-quoted: url("../images/img.jpg");⏎  
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:3 ░░unquoted: url(/images/img.jpg);⏎            04:3 ░░unquoted: url(../images/img.jpg);⏎         
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              5:3 ░░query: url(/images/img.jpg?query);⏎         05:3 ░░query: url(../images/img.jpg?query);⏎      
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:3 ░░hash: url(/images/img.jpg#hash);⏎           06:3 ░░hash: url(../images/img.jpg#hash);⏎        
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
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.f4c290f1d74cb2b8c4a
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      0.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              `,
            compose(
              onlyMeta('meta.engine == "postcss" && meta.version.webpack < 4'),
              assertCssAndSourceMapContent('main.4574dcc1af6189fe3463fbac2bc0bf8e.css', {sanitiseSources: true}),
              outdent
            )`
              /src/feature/index.scss                                                                            
              ---------------------------------------------------------------------------------------------------
              1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:03 ░░single-quoted: url('/images/img.jpg')░░░░░ 2:03 ░░single-quoted: url("../images/img.jpg");░░
              2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    2:43 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎ 
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░double-quoted: url("/images/img.jpg")░░░░░ 3:03 ░░double-quoted: url("../images/img.jpg");░░
              3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    3:43 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎ 
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:03 ░░unquoted: url(/images/img.jpg)░░░░░░░░░░░░ 4:03 ░░unquoted: url(../images/img.jpg);░░░░░░░░░
              4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           4:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎        
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              5:03 ░░query: url(/images/img.jpg?query)░░░░░░░░░ 5:03 ░░query: url(../images/img.jpg?query);░░░░░░
              5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        5:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎     
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:03 ░░hash: url(/images/img.jpg#hash)░░░░░░░░░░░ 6:03 ░░hash: url(../images/img.jpg#hash);░░░░░░░░
              6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          6:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ }⏎     
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                 
              /src/index.scss                                                                                    
              ---------------------------------------------------------------------------------------------------
              2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block;░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:17 ░░░░░░░░░░░░░░░░;⏎                           9:18 ░░░░░░░░░░░░░░░░░ }⏎                        
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.4574dcc1af6189fe34
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      63fbac2bc0bf8e.css.map*/░░░░░░░░░░░░░░░░░░░░
              `,
            compose(
              onlyMeta('meta.engine == "postcss" && meta.version.webpack == 4'),
              assertCssAndSourceMapContent('main.0e7db4d90a70d13fd992.css', {sourceRoot: 'src'}),
              outdent
            )`
              feature/index.scss                                                                                 
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
                                                                                                                 
              index.scss                                                                                         
              ---------------------------------------------------------------------------------------------------
              2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.0e7db4d90a70d13fd9
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      92.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              `,
            compose(
              onlyMeta('meta.engine == "postcss" && meta.version.webpack >= 5'),
              assertCssAndSourceMapContent('main.e45f987dad470a64f369.css'),
              outdent
            )`
              /src/feature/index.scss                                                                            
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
                                                                                                                 
              /src/index.scss                                                                                    
              ---------------------------------------------------------------------------------------------------
              2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.e45f987dad470a64f3
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      69.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
              assertCssAndSourceMapContent('main.b9fc2983490593a91246c92a19004337.css', {sanitiseSources: true}),
              outdent
            )`
              /src/feature/index.scss                                                                            
              ---------------------------------------------------------------------------------------------------
              1:1 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:3 ░░single-quoted: url('/images/img.jpg');⏎    1:018 ░░░░░░░░░░░░░░░░░single-quoted:url("../image
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       s/img.jpg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:3 ░░double-quoted: url("/images/img.jpg");⏎    1:057 ░░░░░░░░░░░░double-quoted:url("../images/img
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       .jpg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:3 ░░unquoted: url(/images/img.jpg);⏎           1:096 ░░░░░░░unquoted:url(../images/img.jpg);░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              5:3 ░░query: url(/images/img.jpg?query);⏎        1:128 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       :url(../images/img.jpg?query);░░░░░░░░░░░░░░
              6:3 ░░hash: url(/images/img.jpg#hash);⏎          1:163 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(../im
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ages/img.jpg#hash)}░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                 
              /src/index.scss                                                                                    
              ---------------------------------------------------------------------------------------------------
              -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:196 ░░░░░░░░░░░░░░░░░░░.another-class-name{░░░░░
              3:3 ░░display: block;⏎                           1:216 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░displ
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ay:block}⏎                                  
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.b9fc2983490593a912
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       46c92a19004337.css.map*/░░░░░░░░░░░░░░░░░░░░
              `,
            compose(
              onlyMeta('meta.engine == "rework" && meta.version.webpack == 4'),
              assertCssAndSourceMapContent('main.94bf8e862e12a5a2077b.css', {sourceRoot: 'src'}),
              outdent
            )`
              feature/index.scss                                                                                 
              ---------------------------------------------------------------------------------------------------
              1:1 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:3 ░░single-quoted: url('/images/img.jpg');⏎    1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(../images
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:3 ░░single-quoted: url('/images/img.jpg');⏎    1:054 ░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:3 ░░double-quoted: url("/images/img.jpg");⏎    1:055 ░░░░░░░░░░double-quoted:url(../images/img.jp
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       g)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:3 ░░double-quoted: url("/images/img.jpg");⏎    1:091 ░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:3 ░░unquoted: url(/images/img.jpg);⏎           1:092 ░░░unquoted:url(../images/img.jpg)░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:3 ░░unquoted: url(/images/img.jpg);⏎           1:123 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              5:3 ░░query: url(/images/img.jpg?query);⏎        1:124 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       (../images/img.jpg?query)░░░░░░░░░░░░░░░░░░░
              5:3 ░░query: url(/images/img.jpg?query);⏎        1:158 ░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:3 ░░hash: url(/images/img.jpg#hash);⏎          1:159 ░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(../images
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /img.jpg#hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                 
              index.scss                                                                                         
              ---------------------------------------------------------------------------------------------------
              -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:191 ░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:1 .another-class-name {⏎                       1:192 ░░░░░░░░░░░░░░░.another-class-name{░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:3 ░░display: block;⏎                           1:212 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░display:b
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       lock░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:225 ░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              `,
            compose(
              onlyMeta('meta.engine == "rework" && meta.version.webpack >= 5'),
              assertCssAndSourceMapContent('main.b7fbfbe03a106de8b226.css'),
              outdent
            )`
              /src/feature/index.scss                                                                            
              ---------------------------------------------------------------------------------------------------
              1:1 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:3 ░░single-quoted: url('/images/img.jpg');⏎    1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(../images
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:3 ░░single-quoted: url('/images/img.jpg');⏎    1:054 ░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:3 ░░double-quoted: url("/images/img.jpg");⏎    1:055 ░░░░░░░░░░double-quoted:url(../images/img.jp
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       g)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:3 ░░double-quoted: url("/images/img.jpg");⏎    1:091 ░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:3 ░░unquoted: url(/images/img.jpg);⏎           1:092 ░░░unquoted:url(../images/img.jpg)░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:3 ░░unquoted: url(/images/img.jpg);⏎           1:123 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              5:3 ░░query: url(/images/img.jpg?query);⏎        1:124 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       (../images/img.jpg?query)░░░░░░░░░░░░░░░░░░░
              5:3 ░░query: url(/images/img.jpg?query);⏎        1:158 ░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:3 ░░hash: url(/images/img.jpg#hash);⏎          1:159 ░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(../images
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /img.jpg#hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                 
              /src/index.scss                                                                                    
              ---------------------------------------------------------------------------------------------------
              -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:191 ░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:1 .another-class-name {⏎                       1:192 ░░░░░░░░░░░░░░░.another-class-name{░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:3 ░░display: block;⏎                           1:212 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░display:b
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       lock░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:225 ░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              `,
            compose(
              onlyMeta('meta.engine == "postcss" && meta.version.webpack < 4'),
              assertCssAndSourceMapContent('main.b9fc2983490593a91246c92a19004337.css', {sanitiseSources: true}),
              outdent
            )`
              /src/feature/index.scss                                                                             
              ----------------------------------------------------------------------------------------------------
              1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              2:03 ░░single-quoted: url('/images/img.jpg');⏎    1:018 ░░░░░░░░░░░░░░░░░single-quoted:url("../image
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       s/img.jpg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░double-quoted: url("/images/img.jpg");⏎    1:057 ░░░░░░░░░░░░double-quoted:url("../images/img
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       .jpg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              4:03 ░░unquoted: url(/images/img.jpg);⏎           1:096 ░░░░░░░unquoted:url(../images/img.jpg);░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              5:03 ░░query: url(/images/img.jpg?query);⏎        1:128 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       :url(../images/img.jpg?query);░░░░░░░░░░░░░░
              6:03 ░░hash: url(/images/img.jpg#hash)░░░░░░░░░░░ 1:163 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(../im
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ages/img.jpg#hash)░░░░░░░░░░░░░░░░░░░░░░░░░░
              6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          1:195 ░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                  
              /src/index.scss                                                                                     
              ----------------------------------------------------------------------------------------------------
              2:01 .another-class-name {⏎                       1:196 ░░░░░░░░░░░░░░░░░░░.another-class-name{░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:216 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░displ
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ay:block░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:17 ░░░░░░░░░░░░░░░░;⏎                           1:229 ░░░░░░░░}⏎                                  
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.b9fc2983490593a912
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       46c92a19004337.css.map*/░░░░░░░░░░░░░░░░░░░░
              `,
            compose(
              onlyMeta('meta.engine == "postcss" && meta.version.webpack == 4'),
              assertCssAndSourceMapContent('main.06d3c235ca5ec72703e6.css', {sourceRoot: 'src'}),
              outdent
            )`
              feature/index.scss                                                                                  
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
                                                                                                                  
              index.scss                                                                                          
              ----------------------------------------------------------------------------------------------------
              2:01 .another-class-name {⏎                       1:192 ░░░░░░░░░░░░░░░.another-class-name{░░░░░░░░░
                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:212 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░display:b
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       lock░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              3:17 ░░░░░░░░░░░░░░░░;⏎                           1:225 ░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              `,
            compose(
              onlyMeta('meta.engine == "postcss" && meta.version.webpack >= 5'),
              assertCssAndSourceMapContent('main.b7fbfbe03a106de8b226.css'),
              outdent
            )`
              /src/feature/index.scss                                                                             
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
                                                                                                                  
              /src/index.scss                                                                                     
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
