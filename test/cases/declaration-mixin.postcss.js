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
          compose(onlyMeta('meta.version.webpack < 5'), assertCssContent, outdent)`
            .some-class-name {
              background-image: url(d68e763c825dc0e388929ae1b375ce18.jpg); }
            `,
          compose(onlyMeta('meta.version.webpack >= 5'), assertCssContent, outdent)`
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
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.4f223bc5b560c4a026550f4491acfbd9.css', {sanitiseSources: true}),
            outdent
          )`
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   @include feature;⏎                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/feature/mixins.scss                                                                           
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 2:03 ░░background-image: url("./img.jpg");░░░░░░░
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         2:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ }⏎    
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.4f223bc5b560c4a026
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      550f4491acfbd9.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.ac9a51ab438078a6f4ae.css', {sourceRoot: 'src'}),
            outdent
          )`
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   @include feature;⏎                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            feature/mixins.scss                                                                                
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 2:03 ░░background-image: url("./img.jpg")░░░░░░░░
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         2:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎    
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.ac9a51ab438078a6f4
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ae.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.9325b9f355d213ed8da0.css'),
            outdent
          )`
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   @include feature;⏎                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/feature/mixins.scss                                                                           
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 2:03 ░░background-image: url("./img.jpg")░░░░░░░░
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         2:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎    
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.9325b9f355d213ed8d
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      a0.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertIncludeMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(onlyMeta('meta.version.webpack < 5'), assertCssContent, trim)`
            .some-class-name{background-image:url(d68e763c825dc0e388929ae1b375ce18.jpg)}
            `,
          compose(onlyMeta('meta.version.webpack >= 5'), assertCssContent, trim)`
            .some-class-name{background-image:url(9eb57a84abbf8abc636d0faa71f9a800.jpg)}
            `
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertIncludeMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.4d5011bf8252e9bbc18d8b57151e8684.css', {sanitiseSources: true}),
            outdent
          )`
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   @include feature;⏎                              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/feature/mixins.scss                                                                           
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 1:18 ░░░░░░░░░░░░░░░░░background-image:url("./img
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      .jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:51 ░░░░░░}⏎                                    
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.4d5011bf8252e9bbc1
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      8d8b57151e8684.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.1989d2b100f23c3bc54e.css', {sourceRoot: 'src'}),
            outdent
          )`
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   @include feature;⏎                              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            feature/mixins.scss                                                                                
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
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   @include feature;⏎                              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/feature/mixins.scss                                                                           
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
          compose(onlyMeta('meta.version.webpack < 5'), assertCssContent, outdent)`
            .some-class-name {
              background-image: url(d68e763c825dc0e388929ae1b375ce18.jpg); }
            `,
          compose(onlyMeta('meta.version.webpack >= 5'), assertCssContent, outdent)`
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
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.c766c04a6915d3b7c3f26d15d8de1db9.css', {sanitiseSources: true}),
            outdent
          )`
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   @include feature;⏎                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/feature/mixins.scss                                                                           
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 2:03 ░░background-image: url("./feature/img.jpg")
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         2:46 ░ }⏎                                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.c766c04a6915d3b7c3
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      f26d15d8de1db9.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.efbf7d7cec35eab2f203.css', {sourceRoot: 'src'}),
            outdent
          )`
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   @include feature;⏎                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            feature/mixins.scss                                                                                
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 2:03 ░░background-image: url("./feature/img.jpg")
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         2:45 ; }⏎                                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.efbf7d7cec35eab2f2
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      03.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.4cd2bacae33ac5c9a2c4.css'),
            outdent
          )`
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   @include feature;⏎                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/feature/mixins.scss                                                                           
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 2:03 ░░background-image: url("./feature/img.jpg")
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         2:45 ; }⏎                                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.4cd2bacae33ac5c9a2
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      c4.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMixinMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(onlyMeta('meta.version.webpack < 5'), assertCssContent, trim)`
            .some-class-name{background-image:url(d68e763c825dc0e388929ae1b375ce18.jpg)}
            `,
          compose(onlyMeta('meta.version.webpack == 5'), assertCssContent, trim)`
            .some-class-name{background-image:url(9eb57a84abbf8abc636d0faa71f9a800.jpg)}
            `
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertMixinMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.6549357ba014e5f25d88df1c87c53781.css', {sanitiseSources: true}),
            outdent
          )`
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   @include feature;⏎                              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/feature/mixins.scss                                                                           
            ---------------------------------------------------------------------------------------------------
            2:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 1:18 ░░░░░░░░░░░░░░░░░background-image:url("./fea
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ture/img.jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:59 ░░░░░░░░░░░░░░}⏎                            
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.6549357ba014e5f25d
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      88df1c87c53781.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.0ba19ee65019ece2ba37.css', {sourceRoot: 'src'}),
            outdent
          )`
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   @include feature;⏎                              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            feature/mixins.scss                                                                                
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
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   @include feature;⏎                              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/feature/mixins.scss                                                                           
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
