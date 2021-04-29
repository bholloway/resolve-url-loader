'use strict';

const {join} = require('path');
const outdent = require('outdent');
const compose = require('compose-function');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('../lib/util');
const {rebaseToCache} = require('../lib/higher-order');
const {all, testDefault, testDebug, testRemoveCR} = require('./common/test');
const {
  buildDevNormal, buildDevNoUrl, buildProdNormal, buildProdNoUrl, buildProdNoDevtool
} = require('./common/exec');
const {assertCssAndSourceMapContent} = require('./common/assert');
const {assertCssContent} = require('../lib/assert');
const {
  onlyMeta, assertWebpackOk, assertWebpackNotOk, assertNoErrors, assertNoMessages, assertStdout,
  assertCssSourceMapComment, assertCssFile, assertSourceMapFile
} = require('../lib/assert');

const assertDebugMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src'} --> ${'./src/img.jpg'}
  [ ]+FOUND$
  `;

// Allow 1-4 errors
//  - known-issue in extract-text-plugin, failed loaders will rerun webpack>=2
//  - webpack may repeat errors with a header line taken from the parent loader
const assertCssError = assertStdout('error')([1, 4])`
  ^[ ]*ERROR[^\n]*
  ([^\n]+\n){0,2}[^\n]*resolve-url-loader:[ ]*error processing CSS
  [ ]+source-map information is not available at url\(\) declaration \(found orphan CR, try removeCR option\)
  `;

module.exports = test(
  'orphan-carriage-return',
  layer('orphan-carriage-return')(
    cwd('.'),
    fs({
      'package.json': rebaseToCache('package.json'),
      'webpack.config.js': rebaseToCache('webpack.config.js'),
      'node_modules': rebaseToCache('node_modules'),
      // NOTE - the CR in the calc() statement induce an offset before the url() statement is hit
      'src/index.scss': outdent`
        .some-class-name {
          font-size: calc(${'\r'}
            (${'\r'}1px${'\r'})${'\r'}
          );
        }
        
        .another-class-name {
          background-image: url('img.jpg');
        }
        `,
      'src/img.jpg': require.resolve('./assets/blank.jpg'),
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testRemoveCR(false)(
      testDefault(
        all(buildDevNormal, buildProdNormal, buildDevNoUrl, buildProdNoUrl)(
          assertWebpackNotOk,
          assertCssError
        )
      )
    ),
    testRemoveCR(true)(
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertCssSourceMapComment(true),
          compose(onlyMeta('meta.version.webpack < 5'), assertCssContent, outdent)`
            .some-class-name {
              font-size: calc(  ( 1px )); }
            
            .another-class-name {
              background-image: url(d68e763c825dc0e388929ae1b375ce18.jpg); }
            `,
          compose(onlyMeta('meta.version.webpack >= 5'), assertCssContent, outdent)`
            .some-class-name {
              font-size: calc(  ( 1px )); }
            
            .another-class-name {
              background-image: url(9eb57a84abbf8abc636d0faa71f9a800.jpg); }
            `
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertCssSourceMapComment(true),
          compose(
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.093ee3cbdee124bd5a8f7c7d42686778.css', {sanitiseSources: true}),
            outdent
          )`
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░font-size: calc(⏎                          2:03 ░░font-size: calc(  ( 1px ));░░░░░░░░░░░░░░░
                     (⇦1px⇦)⏎                                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   )░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:04 ░░░;⏎                                        2:30 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ }⏎            
                 }⏎                                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            7:01 .another-class-name {⏎                       4:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            8:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 5:03 ░░background-image: url("./img.jpg");░░░░░░░
            8:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ }⏎    
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.093ee3cbdee124bd5a
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      8f7c7d42686778.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.6e4443dd51c28c07ae5c.css', {sourceRoot: 'src'}),
            outdent
          )`
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░font-size: calc(⏎                          2:03 ░░font-size: calc(  ( 1px ))░░░░░░░░░░░░░░░░
                     (⇦1px⇦)⏎                                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   )░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:04 ░░░;⏎                                        2:29 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎            
                 }⏎                                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            7:01 .another-class-name {⏎                       4:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            8:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 5:03 ░░background-image: url("./img.jpg")░░░░░░░░
            8:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         5:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎    
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.6e4443dd51c28c07ae
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      5c.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.a66a64f774507001e5e0.css'),
            outdent
          )`
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░font-size: calc(⏎                          2:03 ░░font-size: calc(  ( 1px ))░░░░░░░░░░░░░░░░
                     (⇦1px⇦)⏎                                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   )░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:04 ░░░;⏎                                        2:29 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎            
                 }⏎                                                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            7:01 .another-class-name {⏎                       4:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            8:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 5:03 ░░background-image: url("./img.jpg")░░░░░░░░
            8:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         5:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎    
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.a66a64f774507001e5
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      e0.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
            .some-class-name{font-size:1px}.another-class-name{background-image:
            url(d68e763c825dc0e388929ae1b375ce18.jpg)}
            `,
          compose(onlyMeta('meta.version.webpack >= 5'), assertCssContent, trim)`
            .some-class-name{font-size:1px}.another-class-name{background-image:
            url(9eb57a84abbf8abc636d0faa71f9a800.jpg)}
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
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.c5f2af008d44d3422725753ad64da0cb.css', {sanitiseSources: true}),
            outdent
          )`
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░font-size: calc(⏎                          1:18 ░░░░░░░░░░░░░░░░░font-size:1px░░░░░░░░░░░░░░
                     (⇦1px⇦)⏎                                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   )░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:04 ░░░;⏎                                        1:31 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:02 ░⏎                                           1:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.another-clas
                 ⏎                                                 s-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 .another-class-name {⏎                            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            8:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 1:52 ░░░░░░░background-image:url("./img.jpg")░░░░
            8:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:85 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}⏎  
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.c5f2af008d44d34227
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      25753ad64da0cb.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.86ba9bacab12ac06aa0b.css', {sourceRoot: 'src'}),
            outdent
          )`
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░font-size: calc(⏎                          1:18 ░░░░░░░░░░░░░░░░░font-size:1px░░░░░░░░░░░░░░
                     (⇦1px⇦)⏎                                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   )░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:04 ░░░;⏎                                        1:31 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:02 ░⏎                                           1:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.another-clas
                 ⏎                                                 s-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 .another-class-name {⏎                            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            8:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 1:52 ░░░░░░░background-image:url(img.jpg)░░░░░░░░
            8:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:81 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.e58938fc5e4381ace0b9.css'),
            outdent
          )`
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░font-size: calc(⏎                          1:18 ░░░░░░░░░░░░░░░░░font-size:1px░░░░░░░░░░░░░░
                     (⇦1px⇦)⏎                                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   )░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:04 ░░░;⏎                                        1:31 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:02 ░⏎                                           1:32 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.another-clas
                 ⏎                                                 s-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 .another-class-name {⏎                            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            8:03 ░░background-image: url('img.jpg')░░░░░░░░░░ 1:52 ░░░░░░░background-image:url(img.jpg)░░░░░░░░
            8:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:81 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
