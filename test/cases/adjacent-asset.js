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
  assertCssSourceMapComment, assertCssFile, assertSourceMapFile, assertModuleNotFoundError
} = require('../lib/assert');

const assertDebugMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'../../../packageB/images/img.jpg'}
  [ ]+${'./src/feature'}
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
        assertModuleNotFoundError
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
          compose(onlyMeta('meta.engine == "rework"'), assertCssContent, outdent)`
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
          compose(onlyMeta('meta.engine == "postcss"'), assertCssContent, outdent)`
            .some-class-name {
              single-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              double-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              unquoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              query: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              hash: url(d68e763c825dc0e388929ae1b375ce18.jpg#hash); }
            
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
            onlyMeta('meta.engine == "rework"'),
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.32a9fc6ea0b1860d3a207e9e38de3cef.css'),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                           01:1 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('../../../packageB/image 02:3 ░░single-quoted: url("../../packageB/images/i
                s/img.jpg');⏎                                      mg.jpg");⏎                                   
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("../../../packageB/image 03:3 ░░double-quoted: url("../../packageB/images/i
                s/img.jpg");⏎                                      mg.jpg");⏎                                   
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(../../../packageB/images/img. 04:3 ░░unquoted: url(../../packageB/images/img.jpg
                jpg);⏎                                             );⏎                                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(../../../packageB/images/img.jpg 05:3 ░░query: url(../../packageB/images/img.jpg?qu
                ?query);⏎                                          ery);⏎                                       
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(../../../packageB/images/img.jpg# 06:3 ░░hash: url(../../packageB/images/img.jpg#has
                hash);⏎                                            h);⏎                                         
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
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.32a9fc6ea0b1860d3a2
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      07e9e38de3cef.css.map*/░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "rework"'),
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.cb82f46362f9ca315ba7.css', 'src'),
            outdent
          )`
            feature/index.scss                                                                                  
            ----------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                           01:1 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('../../../packageB/image 02:3 ░░single-quoted: url("../../packageB/images/i
                s/img.jpg');⏎                                      mg.jpg");⏎                                   
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("../../../packageB/image 03:3 ░░double-quoted: url("../../packageB/images/i
                s/img.jpg");⏎                                      mg.jpg");⏎                                   
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(../../../packageB/images/img. 04:3 ░░unquoted: url(../../packageB/images/img.jpg
                jpg);⏎                                             );⏎                                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(../../../packageB/images/img.jpg 05:3 ░░query: url(../../packageB/images/img.jpg?qu
                ?query);⏎                                          ery);⏎                                       
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(../../../packageB/images/img.jpg# 06:3 ░░hash: url(../../packageB/images/img.jpg#has
                hash);⏎                                            h);⏎                                         
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
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.cb82f46362f9ca315ba
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      7.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss"'),
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.d8afb976e857951afc0b2c5d05dfa7d6.css'),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('../../../packageB/imag 2:03 ░░single-quoted: url("../../packageB/images/
                 es/img.jpg')░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      img.jpg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:57 ░░░░░░░░░░░░;⏎                               2:55 ░░░░░░░░░░⏎                                 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("../../../packageB/imag 3:03 ░░double-quoted: url("../../packageB/images/
                 es/img.jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      img.jpg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:57 ░░░░░░░░░░░░;⏎                               3:55 ░░░░░░░░░░⏎                                 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(../../../packageB/images/img 4:03 ░░unquoted: url(../../packageB/images/img.jp
                 .jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g);░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:50 ░░░░░;⏎                                      4:48 ░░░⏎                                        
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(../../../packageB/images/img.jp 5:03 ░░query: url(../../packageB/images/img.jpg?q
                 g?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      uery);░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:53 ░░░░░░░░;⏎                                   5:51 ░░░░░░⏎                                     
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(../../../packageB/images/img.jpg 6:03 ░░hash: url(../../packageB/images/img.jpg#ha
                 #hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      sh);░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:51 ░░░░░░;⏎                                     6:49 ░░░░ }⏎                                     
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block;░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:18 ░░░░░░░░░░░░░░░░░ }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.d8afb976e857951afc
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      0b2c5d05dfa7d6.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss"'),
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.78ceabcf7e7dcba0707a.css', 'src'),
            outdent
          )`
            feature/index.scss                                                                                 
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
                                                                                                               
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.78ceabcf7e7dcba070
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      7a.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack == 4')(
            assertCssSourceMapComment(false)
          ),
          compose(assertCssContent, trim)`
            .some-class-name{single-quoted:url(d68e763c825dc0e388929ae1b375ce18.jpg);double-quoted:
            url(d68e763c825dc0e388929ae1b375ce18.jpg);unquoted:url(d68e763c825dc0e388929ae1b375ce18.jpg);query:
            url(d68e763c825dc0e388929ae1b375ce18.jpg);hash:url(d68e763c825dc0e388929ae1b375ce18.jpg#hash)}
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
          onlyMeta('meta.version.webpack == 4')(
            assertCssSourceMapComment(false)
          ),
          compose(
            onlyMeta('meta.engine == "rework"'),
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.aa63750c6a0b422952024661a1ac51bc.css'),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('../../../packageB/imag 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url("../../pa
                es/img.jpg');⏎                                     ckageB/images/img.jpg");░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("../../../packageB/imag 1:069 ░░░░░░░░░░░░░░░░░░░░░░░░double-quoted:url(".
                es/img.jpg");⏎                                     ./../packageB/images/img.jpg");░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(../../../packageB/images/img 1:120 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░unquoted:url(
                .jpg);⏎                                            ../../packageB/images/img.jpg);░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(../../../packageB/images/img.jp 1:164 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(../
                g?query);⏎                                         ../packageB/images/img.jpg?query);░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(../../../packageB/images/img.jpg 1:211 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(.
                #hash);⏎                                           ./../packageB/images/img.jpg#hash)}░░░░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:256 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.another-
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░display: block;⏎                           1:276 ░░░░░░░░░░░display:block}⏎                  
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.aa63750c6a0b422952
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       024661a1ac51bc.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "rework"'),
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.c1129a624153e83e15c3.css', 'src'),
            outdent
          )`
            feature/index.scss                                                                                 
            ---------------------------------------------------------------------------------------------------
            1:1 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('../../../packageB/imag 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(../../pac
                es/img.jpg');⏎                                     kageB/images/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:3 ░░single-quoted: url('../../../packageB/imag 1:066 ░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░
                es/img.jpg');⏎                                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("../../../packageB/imag 1:067 ░░░░░░░░░░░░░░░░░░░░░░double-quoted:url(../.
                es/img.jpg");⏎                                     ./packageB/images/img.jpg)░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░double-quoted: url("../../../packageB/imag 1:115 ░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░
                es/img.jpg");⏎                                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(../../../packageB/images/img 1:116 ░░░░░░░░░░░░░░░░░░░░░░░░░░░unquoted:url(../.
                .jpg);⏎                                            ./packageB/images/img.jpg)░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:3 ░░unquoted: url(../../../packageB/images/img 1:159 ░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░
                .jpg);⏎                                            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(../../../packageB/images/img.jp 1:160 ░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(../../p
                g?query);⏎                                         ackageB/images/img.jpg?query)░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:3 ░░query: url(../../../packageB/images/img.jp 1:206 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░
                g?query);⏎                                         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:3 ░░hash: url(../../../packageB/images/img.jpg 1:207 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(../..
                #hash);⏎                                           /packageB/images/img.jpg#hash)░░░░░░░░░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:251 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░
            2:1 .another-class-name {⏎                       1:252 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.another-clas
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       s-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░display: block;⏎                           1:272 ░░░░░░░display:block░░░░░░░░░░░░░░░░░░░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:285 ░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss"'),
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.aa63750c6a0b422952024661a1ac51bc.css'),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('../../../packageB/imag 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url("../../pa
                 es/img.jpg');⏎                                     ckageB/images/img.jpg");░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("../../../packageB/imag 1:069 ░░░░░░░░░░░░░░░░░░░░░░░░double-quoted:url(".
                 es/img.jpg");⏎                                     ./../packageB/images/img.jpg");░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(../../../packageB/images/img 1:120 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░unquoted:url(
                 .jpg);⏎                                            ../../packageB/images/img.jpg);░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(../../../packageB/images/img.jp 1:164 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(../
                 g?query);⏎                                         ../packageB/images/img.jpg?query);░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(../../../packageB/images/img.jpg 1:211 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(.
                 #hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ./../packageB/images/img.jpg#hash)░░░░░░░░░░
            6:51 ░░░░░░;⏎                                     1:255 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:256 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.another-
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:276 ░░░░░░░░░░░display:block░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:289 ░░░░░░░░░░░░░░░░░░░░░░░░}⏎                  
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.aa63750c6a0b422952
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       024661a1ac51bc.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss"'),
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.39a9c5c9928362121403.css', 'src'),
            outdent
          )`
            feature/index.scss                                                                                  
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
                                                                                                                
            index.scss                                                                                          
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
