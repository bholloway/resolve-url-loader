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

const assertPropertyMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/value/substring'} --> ${'./src/value/substring/img.jpg'}
  [ ]+${'./src/value'}           --> ${'./src/value/img.jpg'}
  [ ]+${'./src'}                 --> ${'./src/img.jpg'}
  [ ]+FOUND$
  `;

const assertValueMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/value/substring'} --> ${'./src/value/substring/img.jpg'}
  [ ]+${'./src/value'}           --> ${'./src/value/img.jpg'}
  [ ]+FOUND$
  `;

const assertSubstringMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/value/substring'} --> ${'./src/value/substring/img.jpg'}
  [ ]+FOUND$
  `;

module.exports = test(
  'declaration-variable',
  layer('declaration-variable')(
    cwd('.'),
    fs({
      'package.json': rebaseToCache('package.json'),
      'webpack.config.js': rebaseToCache('webpack.config.js'),
      'node_modules': rebaseToCache('node_modules'),
      'src/index.scss': outdent`
          @import "value/variables.scss";
          .some-class-name {
            background-image: $value;
          }
          `,
      'src/value/variables.scss': outdent`
          @import "substring/variables.scss";
          $value: some $url somewhere
          `,
      'src/value/substring/variables.scss': outdent`
          $url: url('img.jpg');
          `,
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
    testWithLabel('asset-property')(
      cwd('.'),
      fs({
        'src/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertPropertyMessages,
          assertCssSourceMapComment(true),
          compose(assertCssContent, outdent)`
            .some-class-name {
              background-image: some url(9eb57a84abbf8abc636d0faa71f9a800.jpg) somewhere; }
            `
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertPropertyMessages,
          assertCssSourceMapComment(true),
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.84c8362c2f73298314b5.css'),
            outdent
          )`
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  2:03 ░░background-image: some url("./img.jpg") som
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ewhere░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/value/variables.scss                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2:52 ░░░░░░; }⏎                                   
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.84c8362c2f73298314b
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      5.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.368e6f956d0703b9fef8.css'),
            outdent
          )`
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  2:03 ░░background-image: some url("./img.jpg") som
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ewhere░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/value/variables.scss                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2:52 ░░░░░░; }⏎                                   
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.368e6f956d0703b9fef
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      8.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertPropertyMessages,
          assertCssSourceMapComment(false),
          compose(assertCssContent, trim)`
            .some-class-name{background-image:some url(9eb57a84abbf8abc636d0faa71f9a800.jpg) somewhere}
            `
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertPropertyMessages,
          assertCssSourceMapComment(false),
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.22ae2c68a8edd3f2e0f6.css'),
            outdent
          )`
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  1:18 ░░░░░░░░░░░░░░░░░background-image:some url(im
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g.jpg) somewhere░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/value/variables.scss                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:62 ░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.55aa6b42b829ef8a30e0.css'),
            outdent
          )`
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  1:18 ░░░░░░░░░░░░░░░░░background-image:some url(im
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g.jpg) somewhere░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/value/variables.scss                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:62 ░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertPropertyMessages,
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
    ),
    testWithLabel('asset-value')(
      cwd('.'),
      fs({
        'src/value/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertValueMessages,
          assertCssSourceMapComment(true),
          compose(assertCssContent, outdent)`
            .some-class-name {
              background-image: some url(9eb57a84abbf8abc636d0faa71f9a800.jpg) somewhere; }
            `
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertValueMessages,
          assertCssSourceMapComment(true),
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.66b031a102af809841d7.css'),
            outdent
          )`
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  2:03 ░░background-image: some url("./value/img.jpg
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ") somewhere░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/value/variables.scss                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2:58 ░░░░░░░░░░░░; }⏎                             
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.66b031a102af809841d
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      7.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.8c5f319b6c3e56b9ea7a.css'),
            outdent
          )`
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  2:03 ░░background-image: some url("./value/img.jpg
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ") somewhere░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/value/variables.scss                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2:58 ░░░░░░░░░░░░; }⏎                             
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.8c5f319b6c3e56b9ea7
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      a.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertValueMessages,
          assertCssSourceMapComment(false),
          compose(assertCssContent, trim)`
            .some-class-name{background-image:some url(9eb57a84abbf8abc636d0faa71f9a800.jpg) somewhere}
            `
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertValueMessages,
          assertCssSourceMapComment(false),
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.1bb12e0744c6135b50ba.css'),
            outdent
          )`
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  1:18 ░░░░░░░░░░░░░░░░░background-image:some url(va
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      lue/img.jpg) somewhere░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/value/variables.scss                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:68 ░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.e8446b74ad49f80b2cf1.css'),
            outdent
          )`
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  1:18 ░░░░░░░░░░░░░░░░░background-image:some url(va
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      lue/img.jpg) somewhere░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/value/variables.scss                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:68 ░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertValueMessages,
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
    ),
    testWithLabel('asset-value-substring')(
      cwd('.'),
      fs({
        'src/value/substring/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSubstringMessages,
          assertCssSourceMapComment(true),
          compose(assertCssContent, outdent)`
            .some-class-name {
              background-image: some url(9eb57a84abbf8abc636d0faa71f9a800.jpg) somewhere; }
            `
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertSubstringMessages,
          assertCssSourceMapComment(true),
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.ab3fe05eace280bada83.css'),
            outdent
          )`
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  2:03 ░░background-image: some url("./value/substri
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ng/img.jpg") somewhere░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/value/variables.scss                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2:68 ░░░░░░░░░░░░░░░░░░░░░░; }⏎                   
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.ab3fe05eace280bada8
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      3.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.421db6b7d794d4599810.css'),
            outdent
          )`
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  2:03 ░░background-image: some url("./value/substri
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ng/img.jpg") somewhere░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            ./src/value/variables.scss                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2:68 ░░░░░░░░░░░░░░░░░░░░░░; }⏎                   
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.421db6b7d794d459981
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      0.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSubstringMessages,
          assertCssSourceMapComment(false),
          compose(assertCssContent, trim)`
            .some-class-name{background-image:some url(9eb57a84abbf8abc636d0faa71f9a800.jpg) somewhere}
            `
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertSubstringMessages,
          assertCssSourceMapComment(false),
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.2a1af40a25b9fc999ba0.css'),
            outdent
          )`
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  1:18 ░░░░░░░░░░░░░░░░░background-image:some url(va
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      lue/substring/img.jpg) somewhere░░░░░░░░░░░░░
                                                                                                                
            ./src/value/variables.scss                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:78 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.3bec6d24c8e52ebb742f.css'),
            outdent
          )`
            ./src/index.scss                                                                                    
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  1:18 ░░░░░░░░░░░░░░░░░background-image:some url(va
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      lue/substring/img.jpg) somewhere░░░░░░░░░░░░░
                                                                                                                
            ./src/value/variables.scss                                                                          
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:78 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░
            `
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertSubstringMessages,
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
