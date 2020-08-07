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

const assertPropertyMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/value/substring'}
  [ ]+${'./src/value'}
  [ ]+${'./src'}
  [ ]+FOUND$
  `;

const assertValueMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/value/substring'}
  [ ]+${'./src/value'}
  [ ]+FOUND$
  `;

const assertSubstringMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]*${'img.jpg'}
  [ ]+${'./src/value/substring'}
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
        assertModuleNotFoundError
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
              background-image: some url(d68e763c825dc0e388929ae1b375ce18.jpg) somewhere; }
            `
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertPropertyMessages,
          assertCssSourceMapComment(true),
          compose(
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.96f2fd25c7e6a43978e8a5a14d2ebff9.css'),
            outdent
          )`
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  2:03 ░░background-image: some url("./img.jpg") som
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ewhere;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/value/variables.scss                                                                           
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2:53 ░░░░░░░ }⏎                                   
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.96f2fd25c7e6a43978e
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      8a5a14d2ebff9.css.map*/░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 4'),
            assertCssAndSourceMapContent('main.aca6c92b278f2368bc8f.css', 'src'),
            outdent
          )`
            index.scss                                                                                          
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  2:03 ░░background-image: some url("./img.jpg") som
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ewhere░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            value/variables.scss                                                                                
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2:52 ░░░░░░; }⏎                                   
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.aca6c92b278f2368bc8
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      f.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertPropertyMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(assertCssContent, trim)`
            .some-class-name{background-image:some url(d68e763c825dc0e388929ae1b375ce18.jpg) somewhere}
            `
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertPropertyMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.f72ea16a0a8071232ec11f243d55dac8.css'),
            outdent
          )`
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  1:18 ░░░░░░░░░░░░░░░░░background-image:some url(".
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /img.jpg") somewhere░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/value/variables.scss                                                                           
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:66 ░░░░░░░░░░░░░░░░░░░░}⏎                       
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.f72ea16a0a8071232ec
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      11f243d55dac8.css.map*/░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 4'),
            assertCssAndSourceMapContent('main.e5eb14ee5e2900a1aecc.css', 'src'),
            outdent
          )`
            index.scss                                                                                          
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  1:18 ░░░░░░░░░░░░░░░░░background-image:some url(im
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      g.jpg) somewhere░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            value/variables.scss                                                                                
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
              background-image: some url(d68e763c825dc0e388929ae1b375ce18.jpg) somewhere; }
            `
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertValueMessages,
          assertCssSourceMapComment(true),
          compose(
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.38019d7e4f783c5dff4149b402a29c50.css'),
            outdent
          )`
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  2:03 ░░background-image: some url("./value/img.jpg
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ") somewhere;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/value/variables.scss                                                                           
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2:59 ░░░░░░░░░░░░░ }⏎                             
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.38019d7e4f783c5dff4
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      149b402a29c50.css.map*/░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 4'),
            assertCssAndSourceMapContent('main.e6d063baf74245631d2f.css', 'src'),
            outdent
          )`
            index.scss                                                                                          
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  2:03 ░░background-image: some url("./value/img.jpg
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ") somewhere░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            value/variables.scss                                                                                
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2:58 ░░░░░░░░░░░░; }⏎                             
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.e6d063baf74245631d2
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      f.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertValueMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(assertCssContent, trim)`
            .some-class-name{background-image:some url(d68e763c825dc0e388929ae1b375ce18.jpg) somewhere}
            `
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertValueMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.50223d89c97527cd95d3f457ac73b96f.css'),
            outdent
          )`
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  1:18 ░░░░░░░░░░░░░░░░░background-image:some url(".
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /value/img.jpg") somewhere░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/value/variables.scss                                                                           
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:72 ░░░░░░░░░░░░░░░░░░░░░░░░░░}⏎                 
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.50223d89c97527cd95d
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      3f457ac73b96f.css.map*/░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 4'),
            assertCssAndSourceMapContent('main.9e1e81e6c8ac95cda014.css', 'src'),
            outdent
          )`
            index.scss                                                                                          
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  1:18 ░░░░░░░░░░░░░░░░░background-image:some url(va
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      lue/img.jpg) somewhere░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            value/variables.scss                                                                                
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
              background-image: some url(d68e763c825dc0e388929ae1b375ce18.jpg) somewhere; }
            `
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertSubstringMessages,
          assertCssSourceMapComment(true),
          compose(
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.51965ae8c4080a520b2112e17ca5fb9d.css'),
            outdent
          )`
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  2:03 ░░background-image: some url("./value/substri
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ng/img.jpg") somewhere;░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/value/variables.scss                                                                           
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2:69 ░░░░░░░░░░░░░░░░░░░░░░░ }⏎                   
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.51965ae8c4080a520b2
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      112e17ca5fb9d.css.map*/░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 4'),
            assertCssAndSourceMapContent('main.e6d81c95e317f9d06421.css', 'src'),
            outdent
          )`
            index.scss                                                                                          
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name {⏎                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  2:03 ░░background-image: some url("./value/substri
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ng/img.jpg") somewhere░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            value/variables.scss                                                                                
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2:68 ░░░░░░░░░░░░░░░░░░░░░░; }⏎                   
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                            
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.e6d81c95e317f9d0642
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      1.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSubstringMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(assertCssContent, trim)`
            .some-class-name{background-image:some url(d68e763c825dc0e388929ae1b375ce18.jpg) somewhere}
            `
        ),
        buildProdNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertSubstringMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.531f47aa72d61f9b920272e1c1f3d777.css'),
            outdent
          )`
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  1:18 ░░░░░░░░░░░░░░░░░background-image:some url(".
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /value/substring/img.jpg") somewhere░░░░░░░░░
                                                                                                                
            /src/value/variables.scss                                                                           
            ----------------------------------------------------------------------------------------------------
            -:- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:82 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}⏎       
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.531f47aa72d61f9b920
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      272e1c1f3d777.css.map*/░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 4'),
            assertCssAndSourceMapContent('main.6aa172c2ed3e739dd3e5.css', 'src'),
            outdent
          )`
            index.scss                                                                                          
            ----------------------------------------------------------------------------------------------------
            2:1 .some-class-name {⏎                           1:01 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:3 ░░background-image: $value;⏎                  1:18 ░░░░░░░░░░░░░░░░░background-image:some url(va
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      lue/substring/img.jpg) somewhere░░░░░░░░░░░░░
                                                                                                                
            value/variables.scss                                                                                
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
