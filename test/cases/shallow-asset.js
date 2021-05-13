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
  ^resolve-url-loader:[^:]+:[ ]*${'../images/img.jpg'}
  [ ]+${'./src/feature'} --> ${'./src/images/img.jpg'}
  [ ]+FOUND$
  `;

module.exports = test(
  'shallow-asset',
  layer('shallow-asset')(
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
          single-quoted: url('../images/img.jpg');
          double-quoted: url("../images/img.jpg");
          unquoted: url(../images/img.jpg);
          query: url(../images/img.jpg?query);
          hash: url(../images/img.jpg#hash);
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
        'src/images/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertCssSourceMapComment(true),
          compose(onlyMeta('meta.version.webpack == 4'), assertCssContent, outdent)`
            .some-class-name {
              single-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              double-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              unquoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              query: url(d68e763c825dc0e388929ae1b375ce18.jpg);
              hash: url(d68e763c825dc0e388929ae1b375ce18.jpg#hash); }
            
            .another-class-name {
              display: block; }
            `,
          compose(onlyMeta('meta.version.webpack >= 5'), assertCssContent, outdent)`
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
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.58a7ea10d6a0a517963d.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                 
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('../images/img.jpg')░░░ 2:03 ░░single-quoted: url("./images/img.jpg")░░░░
            2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  2:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("../images/img.jpg")░░░ 3:03 ░░double-quoted: url("./images/img.jpg")░░░░
            3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  3:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(../images/img.jpg)░░░░░░░░░░ 4:03 ░░unquoted: url(./images/img.jpg)░░░░░░░░░░░
            4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         4:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(../images/img.jpg?query)░░░░░░░ 5:03 ░░query: url(./images/img.jpg?query)░░░░░░░░
            5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      5:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(../images/img.jpg#hash)░░░░░░░░░ 6:03 ░░hash: url(./images/img.jpg#hash)░░░░░░░░░░
            6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        6:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎      
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.58a7ea10d6a0a51796
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      3d.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.e33b0d45841261871eac.css'),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('../images/img.jpg')░░░ 2:03 ░░single-quoted: url("./images/img.jpg")░░░░
            2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  2:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("../images/img.jpg")░░░ 3:03 ░░double-quoted: url("./images/img.jpg")░░░░
            3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  3:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(../images/img.jpg)░░░░░░░░░░ 4:03 ░░unquoted: url(./images/img.jpg)░░░░░░░░░░░
            4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         4:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(../images/img.jpg?query)░░░░░░░ 5:03 ░░query: url(./images/img.jpg?query)░░░░░░░░
            5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      5:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(../images/img.jpg#hash)░░░░░░░░░ 6:03 ░░hash: url(./images/img.jpg#hash)░░░░░░░░░░
            6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        6:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎      
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.e33b0d45841261871e
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ac.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertCssSourceMapComment(false),
          compose(onlyMeta('meta.version.webpack == 4'), assertCssContent, trim)`
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
          assertCssSourceMapComment(false),
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.d5db88dc83a3bbb17efa.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                  
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('../images/img.jpg')░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(images/im
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       g.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  1:051 ░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("../images/img.jpg")░░░ 1:052 ░░░░░░░double-quoted:url(images/img.jpg)░░░░
            3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  1:085 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(../images/img.jpg)░░░░░░░░░░ 1:086 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░unq
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       uoted:url(images/img.jpg)░░░░░░░░░░░░░░░░░░░
            4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:114 ░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(../images/img.jpg?query)░░░░░░░ 1:115 ░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(images/i
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      1:146 ░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(../images/img.jpg#hash)░░░░░░░░░ 1:147 ░░░░░░░░░░░░░░hash:url(images/img.jpg#hash)░
            6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:176 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            index.scss                                                                                          
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:177 .another-class-name{░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:197 ░░░░░░░░░░░░░░░░░░░░display:block░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:210 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.1bcd5ac18d16cb1a7d4e.css'),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('../images/img.jpg')░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(images/im
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       g.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  1:051 ░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("../images/img.jpg")░░░ 1:052 ░░░░░░░double-quoted:url(images/img.jpg)░░░░
            3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  1:085 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(../images/img.jpg)░░░░░░░░░░ 1:086 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░unq
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       uoted:url(images/img.jpg)░░░░░░░░░░░░░░░░░░░
            4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:114 ░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(../images/img.jpg?query)░░░░░░░ 1:115 ░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(images/i
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      1:146 ░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(../images/img.jpg#hash)░░░░░░░░░ 1:147 ░░░░░░░░░░░░░░hash:url(images/img.jpg#hash)░
            6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:176 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:177 .another-class-name{░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:197 ░░░░░░░░░░░░░░░░░░░░display:block░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:210 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░
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
