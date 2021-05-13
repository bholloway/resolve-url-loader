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

const assertIncludeMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/feature'} --> ${'./src/feature/img.jpg'}
  [ ]+${'./src'}         --> ${'./src/img.jpg'}
  [ ]+FOUND$
  `;

const assertMixinMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/feature'} --> ${'./src/feature/img.jpg'}
  [ ]+FOUND$
  `;

module.exports = test(
  'declaration-mixin',
  layer('declaration-mixin')(
    cwd('.'),
    fs({
      'package.json': rebaseToCache('package.json'),
      'webpack.config.js': rebaseToCache('webpack.config.js'),
      'node_modules': rebaseToCache('node_modules'),
      'src/index.scss': outdent`
          @import "feature/mixins.scss";
          .some-class-name {
            @include feature;
          }
          `,
      'src/feature/mixins.scss': outdent`
          @mixin feature {
            background-image: url('img.jpg');
          }
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
    testWithLabel('asset-at-include')(
      cwd('.'),
      fs({
        'src/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertIncludeMessages,
          assertCssSourceMapComment(true),
          compose(assertCssContent, outdent)`
            .some-class-name {
              background-image: url(9eb57a84abbf8abc636d0faa71f9a800.jpg); }
            `
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertIncludeMessages,
          assertCssSourceMapComment(true),
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.52cfa9838af1696e9321.css'),
            outdent
          )`
            ./src/index.scss                                                                                   
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   @include feature;⏎                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            ./src/feature/mixins.scss                                                                          
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 2:03 ░░background-image: url("./img.jpg")░░░░░░░░
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         2:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎    
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.52cfa9838af1696e93
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      21.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.00abd28f6856af6b42c9.css'),
            outdent
          )`
            ./src/index.scss                                                                                   
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   @include feature;⏎                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            ./src/feature/mixins.scss                                                                          
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 2:03 ░░background-image: url("./img.jpg")░░░░░░░░
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         2:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎    
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.00abd28f6856af6b42
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      c9.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertIncludeMessages,
          assertCssSourceMapComment(false),
          compose(assertCssContent, trim)`
            .some-class-name{background-image:url(9eb57a84abbf8abc636d0faa71f9a800.jpg)}
            `
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertIncludeMessages,
          assertCssSourceMapComment(false),
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.dde052fd081dda9c864c.css'),
            outdent
          )`
            ./src/index.scss                                                                                   
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   @include feature;⏎                              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            ./src/feature/mixins.scss                                                                          
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 1:18 ░░░░░░░░░░░░░░░░░background-image:url(img.jp
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:47 ░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.c7a39e4f9127e1c6b77d.css'),
            outdent
          )`
            ./src/index.scss                                                                                   
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   @include feature;⏎                              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            ./src/feature/mixins.scss                                                                          
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 1:18 ░░░░░░░░░░░░░░░░░background-image:url(img.jp
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:47 ░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertIncludeMessages,
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
    testWithLabel('asset-at-definition')(
      cwd('.'),
      fs({
        'src/feature/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMixinMessages,
          assertCssSourceMapComment(true),
          compose(assertCssContent, outdent)`
            .some-class-name {
              background-image: url(9eb57a84abbf8abc636d0faa71f9a800.jpg); }
            `
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertMixinMessages,
          assertCssSourceMapComment(true),
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.1534ff5cd1402fb725ce.css'),
            outdent
          )`
            ./src/index.scss                                                                                   
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   @include feature;⏎                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            ./src/feature/mixins.scss                                                                          
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 2:03 ░░background-image: url("./feature/img.jpg")
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         2:45 ; }⏎                                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.1534ff5cd1402fb725
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ce.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.613c31543a6423df814a.css'),
            outdent
          )`
            ./src/index.scss                                                                                   
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   @include feature;⏎                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            ./src/feature/mixins.scss                                                                          
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 2:03 ░░background-image: url("./feature/img.jpg")
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         2:45 ; }⏎                                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.613c31543a6423df81
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      4a.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMixinMessages,
          assertCssSourceMapComment(false),
          compose(assertCssContent, trim)`
            .some-class-name{background-image:url(9eb57a84abbf8abc636d0faa71f9a800.jpg)}
            `
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertMixinMessages,
          assertCssSourceMapComment(false),
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.de970111de16ddcf4132.css'),
            outdent
          )`
            ./src/index.scss                                                                                   
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   @include feature;⏎                              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            ./src/feature/mixins.scss                                                                          
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 1:18 ░░░░░░░░░░░░░░░░░background-image:url(featur
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      e/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:55 ░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.9da305b887718db0f8b1.css'),
            outdent
          )`
            ./src/index.scss                                                                                   
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   @include feature;⏎                              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            ./src/feature/mixins.scss                                                                          
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 1:18 ░░░░░░░░░░░░░░░░░background-image:url(featur
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      e/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:55 ░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNoDevtool(
          assertWebpackOk,
          assertNoErrors,
          assertMixinMessages,
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
