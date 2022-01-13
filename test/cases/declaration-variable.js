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
  assertWebpackOk, assertWebpackNotOk, assertNoErrors, assertNoMessages, assertStdout,
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
            assertCssAndSourceMapContent(),
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
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.□□□□□□□□□□□□□□□□□□□
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      □.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
            assertCssAndSourceMapContent(),
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
            assertCssAndSourceMapContent(),
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
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.□□□□□□□□□□□□□□□□□□□
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      □.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
            assertCssAndSourceMapContent(),
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
            assertCssAndSourceMapContent(),
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
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.□□□□□□□□□□□□□□□□□□□
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      □.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
            assertCssAndSourceMapContent(),
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
