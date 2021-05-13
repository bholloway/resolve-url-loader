'use strict';

const {join} = require('path');
const outdent = require('outdent');
const compose = require('compose-function');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('../lib/util');
const {rebaseToCache} = require('../lib/higher-order');
const {all, testDefault, testDebug, testRoot} = require('./common/test');
const {
  buildDevNormal, buildDevNoUrl, buildProdNormal, buildProdNoUrl, buildProdNoDevtool
} = require('./common/exec');
const {assertCssAndSourceMapContent} = require('./common/assert');
const {assertCssContent} = require('../lib/assert');
const {
  onlyMeta, assertWebpackOk, assertNoErrors, assertNoMessages,
  assertCssSourceMapComment, assertCssFile, assertSourceMapFile
} = require('../lib/assert');

module.exports = test(
  'http-asset',
  layer('http-asset')(
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
          single-quoted: url('http://google.com');
          double-quoted: url("http://google.com");
          unquoted: url(http://google.com);
          query: url(http://google.com?query);
          hash: url(http://google.com#hash);
        }
        `
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    all(testDefault, testRoot(true))(
      testDebug(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertCssSourceMapComment(true),
          compose(onlyMeta('meta.engine == "postcss"'), assertCssContent, outdent)`
            .some-class-name {
              single-quoted: url("http://google.com");
              double-quoted: url("http://google.com");
              unquoted: url(http://google.com);
              query: url(http://google.com?query);
              hash: url(http://google.com#hash); }
            
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
            assertCssAndSourceMapContent('main.fad3a6c0cd1f188298cff52724660e7a.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('http://google.com')░░░ 2:03 ░░single-quoted: url("http://google.com");░░
            2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  2:43 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("http://google.com")░░░ 3:03 ░░double-quoted: url("http://google.com");░░
            3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  3:43 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(http://google.com)░░░░░░░░░░ 4:03 ░░unquoted: url(http://google.com);░░░░░░░░░
            4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         4:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎        
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(http://google.com?query)░░░░░░░ 5:03 ░░query: url(http://google.com?query);░░░░░░
            5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      5:39 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░⏎     
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(http://google.com#hash)░░░░░░░░░ 6:03 ░░hash: url(http://google.com#hash);░░░░░░░░
            6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        6:37 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ }⏎     
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block;░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:18 ░░░░░░░░░░░░░░░░░ }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.fad3a6c0cd1f188298
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      cff52724660e7a.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.f25d294061b9ae04161f.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                 
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('http://google.com')░░░ 2:03 ░░single-quoted: url("http://google.com")░░░
            2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("http://google.com")░░░ 3:03 ░░double-quoted: url("http://google.com")░░░
            3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(http://google.com)░░░░░░░░░░ 4:03 ░░unquoted: url(http://google.com)░░░░░░░░░░
            4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(http://google.com?query)░░░░░░░ 5:03 ░░query: url(http://google.com?query)░░░░░░░
            5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(http://google.com#hash)░░░░░░░░░ 6:03 ░░hash: url(http://google.com#hash)░░░░░░░░░
            6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎     
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            index.scss                                                                                         
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.f25d294061b9ae0416
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      1f.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.55554baecf6f206a2dac.css'),
            outdent
          )`
            /src/feature/index.scss                                                                            
            ---------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:01 .some-class-name {⏎                         
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('http://google.com')░░░ 2:03 ░░single-quoted: url("http://google.com")░░░
            2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("http://google.com")░░░ 3:03 ░░double-quoted: url("http://google.com")░░░
            3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎ 
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(http://google.com)░░░░░░░░░░ 4:03 ░░unquoted: url(http://google.com)░░░░░░░░░░
            4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(http://google.com?query)░░░░░░░ 5:03 ░░query: url(http://google.com?query)░░░░░░░
            5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎     
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(http://google.com#hash)░░░░░░░░░ 6:03 ░░hash: url(http://google.com#hash)░░░░░░░░░
            6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎     
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                               
            /src/index.scss                                                                                    
            ---------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       8:01 .another-class-name {⏎                      
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           9:17 ░░░░░░░░░░░░░░░░; }⏎                        
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                           
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=main.55554baecf6f206a2d
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ac.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          onlyMeta('meta.version.webpack < 4')(
            assertCssSourceMapComment(true),
            compose(assertCssContent, trim)`
              .some-class-name{single-quoted:url("http://google.com");double-quoted:url("http://google.com");unquoted:
              url(http://google.com);query:url(http://google.com?query);hash:url(http://google.com#hash)}
              .another-class-name{display:block}
              `
          ),
          onlyMeta('meta.version.webpack >= 4')(
            assertCssSourceMapComment(false),
            compose(assertCssContent, trim)`
              .some-class-name{single-quoted:url(http://google.com);double-quoted:url(http://google.com);unquoted:
              url(http://google.com);query:url(http://google.com/?query=);hash:url(http://google.com/#hash)}
              .another-class-name{display:block}
              `
          )
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
            assertCssAndSourceMapContent('main.a7ee1f272d8fc356ca116892c3d8779c.css', {sanitiseSources: true}),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('http://google.com');⏎  1:018 ░░░░░░░░░░░░░░░░░single-quoted:url("http://g
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       oogle.com");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("http://google.com");⏎  1:057 ░░░░░░░░░░░░double-quoted:url("http://google
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       .com");░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(http://google.com);⏎         1:096 ░░░░░░░unquoted:url(http://google.com);░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(http://google.com?query);⏎      1:128 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       :url(http://google.com?query);░░░░░░░░░░░░░░
            6:03 ░░hash: url(http://google.com#hash)░░░░░░░░░ 1:163 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(http:
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       //google.com#hash)░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:195 ░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:196 ░░░░░░░░░░░░░░░░░░░.another-class-name{░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:216 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░displ
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ay:block░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:229 ░░░░░░░░}⏎                                  
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.a7ee1f272d8fc356ca
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       116892c3d8779c.css.map*/░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack == 4'),
            assertCssAndSourceMapContent('main.685bfabad316a14fef1c.css', {sourceRoot: 'src'}),
            outdent
          )`
            feature/index.scss                                                                                  
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('http://google.com')░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(http://go
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ogle.com)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  1:054 ░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("http://google.com")░░░ 1:055 ░░░░░░░░░░double-quoted:url(http://google.co
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       m)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  1:091 ░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(http://google.com)░░░░░░░░░░ 1:092 ░░░unquoted:url(http://google.com)░░░░░░░░░░
            4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:123 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(http://google.com?query)░░░░░░░ 1:124 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       (http://google.com/?query=)░░░░░░░░░░░░░░░░░
            5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      1:160 ░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(http://google.com#hash)░░░░░░░░░ 1:161 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(http://
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       google.com/#hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:194 ░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            index.scss                                                                                          
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:195 ░░░░░░░░░░░░░░░░░░.another-class-name{░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:215 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░displa
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       y:block░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:228 ░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `,
          compose(
            onlyMeta('meta.engine == "postcss" && meta.version.webpack >= 5'),
            assertCssAndSourceMapContent('main.4337affd4cfe5a9af5a4.css'),
            outdent
          )`
            /src/feature/index.scss                                                                             
            ----------------------------------------------------------------------------------------------------
            1:01 .some-class-name {⏎                          1:001 .some-class-name{░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:03 ░░single-quoted: url('http://google.com')░░░ 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url(http://go
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ogle.com)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            2:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  1:054 ░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░double-quoted: url("http://google.com")░░░ 1:055 ░░░░░░░░░░double-quoted:url(http://google.co
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       m)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:42 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎  1:091 ░░;░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            4:03 ░░unquoted: url(http://google.com)░░░░░░░░░░ 1:092 ░░░unquoted:url(http://google.com)░░░░░░░░░░
            4:35 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:123 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            5:03 ░░query: url(http://google.com?query)░░░░░░░ 1:124 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░query:url
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       (http://google.com/?query=)░░░░░░░░░░░░░░░░░
            5:38 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎      1:160 ░░░░░░░░░░░░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:03 ░░hash: url(http://google.com#hash)░░░░░░░░░ 1:161 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░hash:url(http://
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       google.com/#hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░
            6:36 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎        1:194 ░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░
                 }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                                
            /src/index.scss                                                                                     
            ----------------------------------------------------------------------------------------------------
            2:01 .another-class-name {⏎                       1:195 ░░░░░░░░░░░░░░░░░░.another-class-name{░░░░░░
                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:03 ░░display: block░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1:215 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░displa
                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       y:block░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            3:17 ░░░░░░░░░░░░░░░░;⏎                           1:228 ░░░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
