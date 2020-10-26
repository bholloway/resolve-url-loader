'use strict';

const {join} = require('path');
const outdent = require('outdent');
const compose = require('compose-function');
const sequence = require('promise-compose');
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

const assertDebugMessages = sequence(
  assertStdout('debug')(4)`
    ^resolve-url-loader:[^:]+:[ ]*${'../fonts/font.'}\w+
    [ ]+${'./src/feature'}
    [ ]+FOUND$
    `,
  assertStdout('debug')(1)`
    ^resolve-url-loader:[^:]+:[ ]*${'images/img.jpg'}
    [ ]+${'./src'}
    [ ]+FOUND$
    `
);

module.exports = test(
  'selector-in-directive',
  layer('selector-in-directive')(
    cwd('.'),
    fs({
      'package.json': rebaseToCache('package.json'),
      'webpack.config.js': rebaseToCache('webpack.config.js'),
      'node_modules': rebaseToCache('node_modules'),
      'src/index.scss': outdent`
        .some-class-name { 
          @import "feature/index.scss";
        }
        @media only screen {
          .another-class-name {
            single-quoted: url('images/img.jpg');
            double-quoted: url("images/img.jpg");
            unquoted: url(images/img.jpg);
            query: url(images/img.jpg?query);
            hash: url(images/img.jpg#hash);
          }
        }
        `,
      'src/feature/index.scss': outdent`
        @font-face {
          src: url('../fonts/font.eot?v=1.0#iefix') format('embedded-opentype'),
               url("../fonts/font.ttf?v=1.0") format("truetype"),
               url(../fonts/font.woff?v=1.0) format(woff),
               url(../fonts/font.svg#iefix) format(svg);
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
        'src/images/img.jpg': require.resolve('./assets/blank.jpg'),
        'src/fonts/font.eot': require.resolve('./assets/blank.jpg'),
        'src/fonts/font.ttf': require.resolve('./assets/blank.jpg'),
        'src/fonts/font.woff': require.resolve('./assets/blank.jpg'),
        'src/fonts/font.svg': require.resolve('./assets/blank.jpg')
      }),
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertCssSourceMapComment(true),
          compose(onlyMeta('meta.version.webpack < 5'), assertCssContent, outdent)`
            @font-face {
              .some-class-name {
                src: ${
                  trim`
                    url(d68e763c825dc0e388929ae1b375ce18.eot#iefix) format("embedded-opentype")
                    , url(d68e763c825dc0e388929ae1b375ce18.ttf) format("truetype")
                    , url(d68e763c825dc0e388929ae1b375ce18.woff) format(woff)
                    , url(d68e763c825dc0e388929ae1b375ce18.svg#iefix) format(svg)
                    `
                  }; } }
            
            @media only screen {
              .another-class-name {
                single-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
                double-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
                unquoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
                query: url(d68e763c825dc0e388929ae1b375ce18.jpg);
                hash: url(d68e763c825dc0e388929ae1b375ce18.jpg#hash); } }
            `,
          compose(onlyMeta('meta.version.webpack >= 5'), assertCssContent, outdent)`
            @font-face {
              .some-class-name {
                src: ${
                  trim`
                    url(9eb57a84abbf8abc636d0faa71f9a800.eot#iefix) format("embedded-opentype")
                    , url(9eb57a84abbf8abc636d0faa71f9a800.ttf) format("truetype")
                    , url(9eb57a84abbf8abc636d0faa71f9a800.woff) format(woff)
                    , url(9eb57a84abbf8abc636d0faa71f9a800.svg#iefix) format(svg)
                    `
                  }; } }
            
            @media only screen {
              .another-class-name {
                single-quoted: url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
                double-quoted: url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
                unquoted: url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
                query: url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
                hash: url(9eb57a84abbf8abc636d0faa71f9a800.jpg#hash); } }
            `
        ),
        buildDevNoUrl(
          assertWebpackOk,
          assertNoErrors,
          assertDebugMessages,
          assertCssSourceMapComment(true),
          compose(
            onlyMeta('meta.version.webpack < 4'),
            assertCssAndSourceMapContent('main.04030b110245cc0bf848c5409a4e925c.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            01:01 @font-face {⏎                               01:001 @font-face {⏎                              
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            02:03 ░░src: url('../fonts/font.eot?v=1.0#iefix') 03:005 ░░░░src: url("./fonts/font.eot?v=1.0#iefix"
                   format('embedded-opentype'),⏎                     ) format("embedded-opentype"), url("./fonts
                         url("../fonts/font.ttf?v=1.0") forma        /font.ttf?v=1.0") format("truetype"), url(.
                  t("truetype"),⏎                                    /fonts/font.woff?v=1.0) format(woff), url(.
                         url(../fonts/font.woff?v=1.0) format        /fonts/font.svg#iefix) format(svg);░░░░░░░░
                  (woff),⏎                                           ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                         url(../fonts/font.svg#iefix) format(        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  svg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            05:48 ░░░░;⏎                                      03:208 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ } }░░░░
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            01:01 .some-class-name { ⏎                        02:003 ░░.some-class-name {⏎                      
                    @import "feature/index.scss";⏎                       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            03:02 ░⏎                                          03:212 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎   
            04:01 @media only screen {⏎                       05:001 @media only screen {⏎                      
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            05:03 ░░.another-class-name {⏎                    06:003 ░░.another-class-name {⏎                   
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            06:05 ░░░░single-quoted: url('images/img.jpg')░░░ 07:005 ░░░░single-quoted: url("./images/img.jpg");
            06:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  07:044 ⏎                                          
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            07:05 ░░░░double-quoted: url("images/img.jpg")░░░ 08:005 ░░░░double-quoted: url("./images/img.jpg");
            07:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  08:044 ⏎                                          
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            08:05 ░░░░unquoted: url(images/img.jpg)░░░░░░░░░░ 09:005 ░░░░unquoted: url(./images/img.jpg);░░░░░░░
            08:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         09:037 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎      
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            09:05 ░░░░query: url(images/img.jpg?query)░░░░░░░ 10:005 ░░░░query: url(./images/img.jpg?query);░░░░
            09:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      10:040 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎   
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            10:05 ░░░░hash: url(images/img.jpg#hash)░░░░░░░░░ 11:005 ░░░░hash: url(./images/img.jpg#hash);░░░░░░
            10:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        11:038 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ } }░░
                    }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            11:04 ░░░⏎                                        11:042 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎ 
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ⏎                                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        /*# sourceMappingURL=main.04030b110245cc0bf
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        848c5409a4e925c.css.map*/░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.844d34240f4c1ad0b8eb.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                  
            ----------------------------------------------------------------------------------------------------
            01:01 @font-face {⏎                               01:001 @font-face {⏎                              
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            02:03 ░░src: url('../fonts/font.eot?v=1.0#iefix') 03:005 ░░░░src: url("./fonts/font.eot?v=1.0#iefix"
                   format('embedded-opentype'),⏎                     ) format("embedded-opentype"), url("./fonts
                         url("../fonts/font.ttf?v=1.0") forma        /font.ttf?v=1.0") format("truetype"), url(.
                  t("truetype"),⏎                                    /fonts/font.woff?v=1.0) format(woff), url(.
                         url(../fonts/font.woff?v=1.0) format        /fonts/font.svg#iefix) format(svg)░░░░░░░░░
                  (woff),⏎                                           ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                         url(../fonts/font.svg#iefix) format(        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  svg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            05:48 ░░░░;⏎                                      03:207 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; } ░░░░░
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            index.scss                                                                                          
            ----------------------------------------------------------------------------------------------------
            01:01 .some-class-name { ⏎                        02:003 ░░.some-class-name {⏎                      
                    @import "feature/index.scss";⏎                       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            03:02 ░⏎                                          03:211 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}⏎   
            04:01 @media only screen {⏎                       05:001 @media only screen {⏎                      
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            05:03 ░░.another-class-name {⏎                    06:003 ░░.another-class-name {⏎                   
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            06:05 ░░░░single-quoted: url('images/img.jpg')░░░ 07:005 ░░░░single-quoted: url("./images/img.jpg")░
            06:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  07:043 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ⏎                                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            07:05 ░░░░double-quoted: url("images/img.jpg")░░░ 08:005 ░░░░double-quoted: url("./images/img.jpg")░
            07:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  08:043 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ⏎                                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            08:05 ░░░░unquoted: url(images/img.jpg)░░░░░░░░░░ 09:005 ░░░░unquoted: url(./images/img.jpg)░░░░░░░░
            08:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         09:036 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            09:05 ░░░░query: url(images/img.jpg?query)░░░░░░░ 10:005 ░░░░query: url(./images/img.jpg?query)░░░░░
            09:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      10:039 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎   
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            10:05 ░░░░hash: url(images/img.jpg#hash)░░░░░░░░░ 11:005 ░░░░hash: url(./images/img.jpg#hash)░░░░░░░
            10:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        11:037 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; } ░░░
                    }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            11:04 ░░░⏎                                        11:041 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}⏎ 
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ⏎                                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ⏎                                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        /*# sourceMappingURL=main.844d34240f4c1ad0b
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        8eb.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.1e945b49565e8c8db929.css'),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            01:01 @font-face {⏎                               01:001 @font-face {⏎                              
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            02:03 ░░src: url('../fonts/font.eot?v=1.0#iefix') 03:005 ░░░░src: url("./fonts/font.eot?v=1.0#iefix"
                   format('embedded-opentype'),⏎                     ) format("embedded-opentype"), url("./fonts
                         url("../fonts/font.ttf?v=1.0") forma        /font.ttf?v=1.0") format("truetype"), url(.
                  t("truetype"),⏎                                    /fonts/font.woff?v=1.0) format(woff), url(.
                         url(../fonts/font.woff?v=1.0) format        /fonts/font.svg#iefix) format(svg)░░░░░░░░░
                  (woff),⏎                                           ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                         url(../fonts/font.svg#iefix) format(        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  svg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            05:48 ░░░░;⏎                                      03:207 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; } ░░░░░
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            01:01 .some-class-name { ⏎                        02:003 ░░.some-class-name {⏎                      
                    @import "feature/index.scss";⏎                       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            03:02 ░⏎                                          03:211 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}⏎   
            04:01 @media only screen {⏎                       05:001 @media only screen {⏎                      
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            05:03 ░░.another-class-name {⏎                    06:003 ░░.another-class-name {⏎                   
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            06:05 ░░░░single-quoted: url('images/img.jpg')░░░ 07:005 ░░░░single-quoted: url("./images/img.jpg")░
            06:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  07:043 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ⏎                                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            07:05 ░░░░double-quoted: url("images/img.jpg")░░░ 08:005 ░░░░double-quoted: url("./images/img.jpg")░
            07:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  08:043 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ⏎                                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            08:05 ░░░░unquoted: url(images/img.jpg)░░░░░░░░░░ 09:005 ░░░░unquoted: url(./images/img.jpg)░░░░░░░░
            08:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         09:036 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            09:05 ░░░░query: url(images/img.jpg?query)░░░░░░░ 10:005 ░░░░query: url(./images/img.jpg?query)░░░░░
            09:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      10:039 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎   
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            10:05 ░░░░hash: url(images/img.jpg#hash)░░░░░░░░░ 11:005 ░░░░hash: url(./images/img.jpg#hash)░░░░░░░
            10:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        11:037 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; } ░░░
                    }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            11:04 ░░░⏎                                        11:041 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}⏎ 
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ⏎                                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ⏎                                          
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        /*# sourceMappingURL=main.1e945b49565e8c8db
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        929.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
            @font-face{.some-class-name{src:url(d68e763c825dc0e388929ae1b375ce18.eot#iefix) format("embedded-opentype"),
            url(d68e763c825dc0e388929ae1b375ce18.ttf) format("truetype"),
            url(d68e763c825dc0e388929ae1b375ce18.woff) format(woff),
            url(d68e763c825dc0e388929ae1b375ce18.svg#iefix) format(svg)}}
            @media only screen{.another-class-name{single-quoted:url(d68e763c825dc0e388929ae1b375ce18.jpg);
            double-quoted:url(d68e763c825dc0e388929ae1b375ce18.jpg);unquoted:url(d68e763c825dc0e388929ae1b375ce18.jpg);
            query:url(d68e763c825dc0e388929ae1b375ce18.jpg);hash:url(d68e763c825dc0e388929ae1b375ce18.jpg#hash)}}
            `,
          compose(onlyMeta('meta.version.webpack >= 5'), assertCssContent, trim)`
            @font-face{.some-class-name{src:url(9eb57a84abbf8abc636d0faa71f9a800.eot#iefix) format("embedded-opentype"),
            url(9eb57a84abbf8abc636d0faa71f9a800.ttf) format("truetype"),
            url(9eb57a84abbf8abc636d0faa71f9a800.woff) format(woff),
            url(9eb57a84abbf8abc636d0faa71f9a800.svg#iefix) format(svg)}}
            @media only screen{.another-class-name{single-quoted:url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
            double-quoted:url(9eb57a84abbf8abc636d0faa71f9a800.jpg);unquoted:url(9eb57a84abbf8abc636d0faa71f9a800.jpg);
            query:url(9eb57a84abbf8abc636d0faa71f9a800.jpg);hash:url(9eb57a84abbf8abc636d0faa71f9a800.jpg#hash)}}
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
            assertCssAndSourceMapContent('main.c198cdf109d5e2d9a966831381afad9f.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            01:01 @font-face {⏎                               1:001 @font-face{░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            02:03 ░░src: url('../fonts/font.eot?v=1.0#iefix') 1:029 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░src:url("./font
                   format('embedded-opentype'),⏎                    s/font.eot?v=1.0#iefix") format("embedded-o
                         url("../fonts/font.ttf?v=1.0") forma       pentype"),url("./fonts/font.ttf?v=1.0") for
                  t("truetype"),⏎                                   mat("truetype"),url(./fonts/font.woff?v=1.0
                         url(../fonts/font.woff?v=1.0) format       ) format(woff),url(./fonts/font.svg#iefix) 
                  (woff),⏎                                          format(svg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                         url(../fonts/font.svg#iefix) format(       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  svg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            05:48 ░░░░;⏎                                      1:227 ░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            01:01 .some-class-name { ⏎                        1:012 ░░░░░░░░░░░.some-class-name{░░░░░░░░░░░░░░░
                    @import "feature/index.scss";⏎                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            03:02 ░⏎                                          1:228 ░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            04:01 @media only screen {⏎                       1:229 ░░░░░░░░░░░░░@media only screen{░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            05:03 ░░.another-class-name {⏎                    1:248 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.another-cl
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ass-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            06:05 ░░░░single-quoted: url('images/img.jpg');⏎  1:268 ░░░░░░░░░single-quoted:url("./images/img.jp
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       g");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            07:05 ░░░░double-quoted: url("images/img.jpg");⏎  1:306 ░░░░double-quoted:url("./images/img.jpg");░
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            08:05 ░░░░unquoted: url(images/img.jpg);⏎         1:344 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░u
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       nquoted:url(./images/img.jpg);░░░░░░░░░░░░░
            09:05 ░░░░query: url(images/img.jpg?query);⏎      1:375 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url(./i
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mages/img.jpg?query);░░░░░░░░░░░░░░░░░░░░░░
            10:05 ░░░░hash: url(images/img.jpg#hash)░░░░░░░░░ 1:409 ░░░░░░░░░░░░░░░░░░░░░hash:url(./images/img.
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       jpg#hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            10:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:440 ░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            11:04 ░░░⏎                                        1:441 ░░░░░░░░░░}⏎                               
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.c198cdf109d5e2d9a
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       966831381afad9f.css.map*/░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.452c075bf6e432b8fc1c.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                 
            ---------------------------------------------------------------------------------------------------
            01:01 @font-face {⏎                               1:001 @font-face{░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            02:03 ░░src: url('../fonts/font.eot?v=1.0#iefix') 1:029 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░src:url(fonts/f
                   format('embedded-opentype'),⏎                    ont.eot?v=1.0#iefix) format("embedded-opent
                         url("../fonts/font.ttf?v=1.0") forma       ype"),url(fonts/font.ttf?v=1.0) format("tru
                  t("truetype"),⏎                                   etype"),url(fonts/font.woff?v=1.0) format(w
                         url(../fonts/font.woff?v=1.0) format       off),url(fonts/font.svg#iefix) format(svg)░
                  (woff),⏎                                          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                         url(../fonts/font.svg#iefix) format(       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  svg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            05:48 ░░░░;⏎                                      1:215 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            01:01 .some-class-name { ⏎                        1:012 ░░░░░░░░░░░.some-class-name{░░░░░░░░░░░░░░░
                    @import "feature/index.scss";⏎                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            03:02 ░⏎                                          1:216 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            04:01 @media only screen {⏎                       1:217 ░@media only screen{░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            05:03 ░░.another-class-name {⏎                    1:236 ░░░░░░░░░░░░░░░░░░░░.another-class-name{░░░
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            06:05 ░░░░single-quoted: url('images/img.jpg')░░░ 1:256 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░sin
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       gle-quoted:url(images/img.jpg)░░░░░░░░░░░░░
            06:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  1:289 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            07:05 ░░░░double-quoted: url("images/img.jpg")░░░ 1:290 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░double-quote
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       d:url(images/img.jpg)░░░░░░░░░░░░░░░░░░░░░░
            07:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  1:323 ░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            08:05 ░░░░unquoted: url(images/img.jpg)░░░░░░░░░░ 1:324 ░░░░░░░░░░░░░░░░░░░░░░unquoted:url(images/i
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            08:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:352 ░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            09:05 ░░░░query: url(images/img.jpg?query)░░░░░░░ 1:353 ░░░░░░░░query:url(images/img.jpg?query)░░░░
            09:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      1:384 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            10:05 ░░░░hash: url(images/img.jpg#hash)░░░░░░░░░ 1:385 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░has
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       h:url(images/img.jpg#hash)░░░░░░░░░░░░░░░░░
            10:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:414 ░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░
                    }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            11:04 ░░░⏎                                        1:415 ░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.9a84e059d13225129139.css'),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            01:01 @font-face {⏎                               1:001 @font-face{░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            02:03 ░░src: url('../fonts/font.eot?v=1.0#iefix') 1:029 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░src:url(fonts/f
                   format('embedded-opentype'),⏎                    ont.eot?v=1.0#iefix) format("embedded-opent
                         url("../fonts/font.ttf?v=1.0") forma       ype"),url(fonts/font.ttf?v=1.0) format("tru
                  t("truetype"),⏎                                   etype"),url(fonts/font.woff?v=1.0) format(w
                         url(../fonts/font.woff?v=1.0) format       off),url(fonts/font.svg#iefix) format(svg)░
                  (woff),⏎                                          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                         url(../fonts/font.svg#iefix) format(       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  svg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            05:48 ░░░░;⏎                                      1:215 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░}
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            01:01 .some-class-name { ⏎                        1:012 ░░░░░░░░░░░.some-class-name{░░░░░░░░░░░░░░░
                    @import "feature/index.scss";⏎                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            03:02 ░⏎                                          1:216 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            04:01 @media only screen {⏎                       1:217 ░@media only screen{░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            05:03 ░░.another-class-name {⏎                    1:236 ░░░░░░░░░░░░░░░░░░░░.another-class-name{░░░
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            06:05 ░░░░single-quoted: url('images/img.jpg')░░░ 1:256 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░sin
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       gle-quoted:url(images/img.jpg)░░░░░░░░░░░░░
            06:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  1:289 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            07:05 ░░░░double-quoted: url("images/img.jpg")░░░ 1:290 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░double-quote
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       d:url(images/img.jpg)░░░░░░░░░░░░░░░░░░░░░░
            07:41 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  1:323 ░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            08:05 ░░░░unquoted: url(images/img.jpg)░░░░░░░░░░ 1:324 ░░░░░░░░░░░░░░░░░░░░░░unquoted:url(images/i
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       mg.jpg)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            08:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:352 ░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            09:05 ░░░░query: url(images/img.jpg?query)░░░░░░░ 1:353 ░░░░░░░░query:url(images/img.jpg?query)░░░░
            09:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      1:384 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░
                      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            10:05 ░░░░hash: url(images/img.jpg#hash)░░░░░░░░░ 1:385 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░has
                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       h:url(images/img.jpg#hash)░░░░░░░░░░░░░░░░░
            10:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:414 ░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░
                    }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            11:04 ░░░⏎                                        1:415 ░░░░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░
                  }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
