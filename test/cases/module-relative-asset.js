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
  onlyMeta, assertWebpackOk, assertWebpackNotOk, assertNoErrors, assertNoMessages,
  assertCssSourceMapComment, assertCssFile, assertSourceMapFile, assertAssetError
} = require('../lib/assert');

module.exports = test(
  'module-relative-asset',
  layer('module-relative-asset')(
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
          single-quoted: url('~images/img.jpg');
          double-quoted: url("~images/img.jpg");
          unquoted: url(~images/img.jpg);
          query: url(~images/img.jpg?query);
          hash: url(~images/img.jpg#hash);
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
        'modules/images/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertCssSourceMapComment(true),
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
          assertNoMessages,
          assertCssSourceMapComment(true),
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.625f6e2060afe29b4d331b9d1915c4a7.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('~images/img.jpg')░░░░░ 2:03 ░░single-quoted: url("~images/img.jpg");░░░░
            2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    2:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎   
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("~images/img.jpg")░░░░░ 3:03 ░░double-quoted: url("~images/img.jpg");░░░░
            3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    3:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎   
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(~images/img.jpg)░░░░░░░░░░░░ 4:03 ░░unquoted: url(~images/img.jpg);░░░░░░░░░░░
            4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           4:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎          
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(~images/img.jpg?query)░░░░░░░░░ 5:03 ░░query: url(~images/img.jpg?query);░░░░░░░░
            5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        5:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎       
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(~images/img.jpg#hash)░░░░░░░░░░░ 6:03 ░░hash: url(~images/img.jpg#hash);░░░░░░░░░░
            6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          6:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ }⏎       
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block;░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:18 ░░░░░░░░░░░░░░░░░ }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.625f6e2060afe29b4d
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      331b9d1915c4a7.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.65beeb84e113d8dc332b.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                 
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('~images/img.jpg')░░░░░ 2:03 ░░single-quoted: url("~images/img.jpg")░░░░░
            2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎   
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("~images/img.jpg")░░░░░ 3:03 ░░double-quoted: url("~images/img.jpg")░░░░░
            3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎   
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(~images/img.jpg)░░░░░░░░░░░░ 4:03 ░░unquoted: url(~images/img.jpg)░░░░░░░░░░░░
            4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(~images/img.jpg?query)░░░░░░░░░ 5:03 ░░query: url(~images/img.jpg?query)░░░░░░░░░
            5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎       
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(~images/img.jpg#hash)░░░░░░░░░░░ 6:03 ░░hash: url(~images/img.jpg#hash)░░░░░░░░░░░
            6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎       
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.65beeb84e113d8dc33
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      2b.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.55a24b342c08f60295d4.css'),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('~images/img.jpg')░░░░░ 2:03 ░░single-quoted: url("~images/img.jpg")░░░░░
            2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎   
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("~images/img.jpg")░░░░░ 3:03 ░░double-quoted: url("~images/img.jpg")░░░░░
            3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎   
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(~images/img.jpg)░░░░░░░░░░░░ 4:03 ░░unquoted: url(~images/img.jpg)░░░░░░░░░░░░
            4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(~images/img.jpg?query)░░░░░░░░░ 5:03 ░░query: url(~images/img.jpg?query)░░░░░░░░░
            5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎       
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(~images/img.jpg#hash)░░░░░░░░░░░ 6:03 ░░hash: url(~images/img.jpg#hash)░░░░░░░░░░░
            6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎       
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.55a24b342c08f60295
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      d4.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
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
          assertNoMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true)
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false)
          ),
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.963b61bf92559efa3d9645ef55b87221.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('~images/img.jpg');⏎    1:018 ░░░░░░░░░░░░░░░░░single-quoted:url("~images/
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       img.jpg");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("~images/img.jpg");⏎    1:055 ░░░░░░░░░░double-quoted:url("~images/img.jpg
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(~images/img.jpg);⏎           1:092 ░░░unquoted:url(~images/img.jpg);░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(~images/img.jpg?query);⏎        1:122 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(~
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       images/img.jpg?query);░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(~images/img.jpg#hash)░░░░░░░░░░░ 1:155 ░░░░░░░░░░░░░░░░░░░░░░hash:url(~images/img.j
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       pg#hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          1:185 ░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:186 ░░░░░░░░░.another-class-name{░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:206 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░display:block░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:219 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}⏎
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.963b61bf92559efa3d
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       9645ef55b87221.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.6156b39780effbf162c4.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                  
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('~images/img.jpg')░░░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(~images/i
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    1:052 ░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("~images/img.jpg")░░░░░ 1:053 ░░░░░░░░double-quoted:url(~images/img.jpg)░░
            3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    1:087 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(~images/img.jpg)░░░░░░░░░░░░ 1:088 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░u
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       nquoted:url(~images/img.jpg)░░░░░░░░░░░░░░░░
            4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           1:117 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(~images/img.jpg?query)░░░░░░░░░ 1:118 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(~imag
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       es/img.jpg?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:150 ░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(~images/img.jpg#hash)░░░░░░░░░░░ 1:151 ░░░░░░░░░░░░░░░░░░hash:url(~images/img.jpg#h
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          1:181 ░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
            assertCssAndSourceMapContent('main.7eed15f666debb39092e.css'),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('~images/img.jpg')░░░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(~images/i
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    1:052 ░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("~images/img.jpg")░░░░░ 1:053 ░░░░░░░░double-quoted:url(~images/img.jpg)░░
            3:40 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎    1:087 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(~images/img.jpg)░░░░░░░░░░░░ 1:088 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░u
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       nquoted:url(~images/img.jpg)░░░░░░░░░░░░░░░░
            4:33 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎           1:117 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(~images/img.jpg?query)░░░░░░░░░ 1:118 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(~imag
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       es/img.jpg?query)░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:150 ░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(~images/img.jpg#hash)░░░░░░░░░░░ 1:151 ░░░░░░░░░░░░░░░░░░hash:url(~images/img.jpg#h
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎          1:181 ░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
          assertNoMessages,
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
