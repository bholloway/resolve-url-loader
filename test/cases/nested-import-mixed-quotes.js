'use strict';

const {join} = require('path');
const outdent = require('outdent');
const compose = require('compose-function');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim, encodeXml} = require('../lib/util');
const {rebaseToCache} = require('../lib/higher-order');
const {all, testDefault, testDebug} = require('./common/test');
const {
  buildDevNormal, buildDevNoUrl, buildProdNormal, buildProdNoUrl, buildProdNoDevtool
} = require('./common/exec');
const {assertCssAndSourceMapContent} = require('./common/assert');
const {assertCssContent} = require('../lib/assert');
const {
  onlyMeta, assertWebpackOk, assertNoErrors, assertNoMessages,
  assertCssSourceMapComment, assertCssFile, assertSourceMapFile,
} = require('../lib/assert');

const iconSvgXml = encodeXml`
  <svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
      <path stroke="red" stroke-width="2" stroke-linecap="round" stroke-miterlimit="10" d="M4 7h22M4 15h22M4 23h22"/>
  </svg>
  `;

module.exports = test(
  'nested-import-mixed-quotes',
  layer('nested-import-mixed-quotes')(
    cwd('.'),
    fs({
      'package.json': rebaseToCache('package.json'),
      'webpack.config.js': rebaseToCache('webpack.config.js'),
      'node_modules': rebaseToCache('node_modules'),
      'src/index.scss': outdent`
        .some-class-name {
          @import "feature/index.scss";
        }
        `,
      'src/feature/index.scss': outdent`
        .another-class-name {
          background-image: url("data:image/svg+xml;charset=utf8,${iconSvgXml}");
        }
        `
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testDebug(
      buildDevNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertCssSourceMapComment(true),
        compose(assertCssContent, outdent)`
          .some-class-name .another-class-name {
            background-image: url("data:image/svg+xml;charset=utf8,${iconSvgXml}"); }
          `
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertCssSourceMapComment(true),
        compose(
          onlyMeta('meta.version.webpack == 4'),
          assertCssAndSourceMapContent('main.a69e0714fec5375da4d0.css'),
          outdent
        )`
          ./src/index.scss                                                                                   
          ---------------------------------------------------------------------------------------------------
          1:001 .some-class-name {⏎                         1:001 .some-class-name .another-class-name {⏎    
                  @import "feature/index.scss";⏎                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                             
          ./src/feature/index.scss                                                                           
          ---------------------------------------------------------------------------------------------------
          2:003 ░░background-image: url("data:image/svg+xml 2:003 ░░background-image: url("data:image/svg+xml
                ;charset=utf8,%3Csvg viewBox='0 0 30 30' xm       ;charset=utf8,%3Csvg viewBox='0 0 30 30' xm
                lns='http://www.w3.org/2000/svg'%3E%3Cpath        lns='http://www.w3.org/2000/svg'%3E%3Cpath 
                stroke='red' stroke-width='2' stroke-lineca       stroke='red' stroke-width='2' stroke-lineca
                p='round' stroke-miterlimit='10' d='M4 7h22       p='round' stroke-miterlimit='10' d='M4 7h22
                M4 15h22M4 23h22'/%3E%3C/svg%3E")░░░░░░░░░░       M4 15h22M4 23h22'/%3E%3C/svg%3E")░░░░░░░░░░
          2:249 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         2:249 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎      
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ⏎                                          
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ⏎                                          
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.a69e0714fec5375da
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       4d0.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
          `,
        compose(
          onlyMeta('meta.version.webpack >= 5'),
          assertCssAndSourceMapContent('main.0de225be0d103507fb2e.css'),
          outdent
        )`
          ./src/index.scss                                                                                   
          ---------------------------------------------------------------------------------------------------
          1:001 .some-class-name {⏎                         1:001 .some-class-name .another-class-name {⏎    
                  @import "feature/index.scss";⏎                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                             
          ./src/feature/index.scss                                                                           
          ---------------------------------------------------------------------------------------------------
          2:003 ░░background-image: url("data:image/svg+xml 2:003 ░░background-image: url("data:image/svg+xml
                ;charset=utf8,%3Csvg viewBox='0 0 30 30' xm       ;charset=utf8,%3Csvg viewBox='0 0 30 30' xm
                lns='http://www.w3.org/2000/svg'%3E%3Cpath        lns='http://www.w3.org/2000/svg'%3E%3Cpath 
                stroke='red' stroke-width='2' stroke-lineca       stroke='red' stroke-width='2' stroke-lineca
                p='round' stroke-miterlimit='10' d='M4 7h22       p='round' stroke-miterlimit='10' d='M4 7h22
                M4 15h22M4 23h22'/%3E%3C/svg%3E")░░░░░░░░░░       M4 15h22M4 23h22'/%3E%3C/svg%3E")░░░░░░░░░░
          2:249 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         2:249 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░; }⏎      
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ⏎                                          
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ⏎                                          
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       /*# sourceMappingURL=main.0de225be0d103507f
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       b2e.css.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
          `
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertCssSourceMapComment(false),
        compose(assertCssContent, trim)`
          .some-class-name .another-class-name{background-image:url("data:image/svg+xml;charset=utf8,${iconSvgXml}")}
          `
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages,
        assertCssSourceMapComment(false),
        compose(
          onlyMeta('meta.version.webpack == 4'),
          assertCssAndSourceMapContent('main.e412140a3a03ab5a8aa0.css'),
          outdent
        )`
          ./src/index.scss                                                                                   
          ---------------------------------------------------------------------------------------------------
          1:001 .some-class-name {⏎                         1:001 .some-class-name .another-class-name{░░░░░░
                  @import "feature/index.scss";⏎                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                             
          ./src/feature/index.scss                                                                           
          ---------------------------------------------------------------------------------------------------
          2:003 ░░background-image: url("data:image/svg+xml 1:038 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░backgr
                ;charset=utf8,%3Csvg viewBox='0 0 30 30' xm       ound-image:url("data:image/svg+xml;charset=
                lns='http://www.w3.org/2000/svg'%3E%3Cpath        utf8,%3Csvg viewBox='0 0 30 30' xmlns='http
                stroke='red' stroke-width='2' stroke-lineca       ://www.w3.org/2000/svg'%3E%3Cpath stroke='r
                p='round' stroke-miterlimit='10' d='M4 7h22       ed' stroke-width='2' stroke-linecap='round'
                M4 15h22M4 23h22'/%3E%3C/svg%3E")░░░░░░░░░░        stroke-miterlimit='10' d='M4 7h22M4 15h22M
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       4 23h22'/%3E%3C/svg%3E")░░░░░░░░░░░░░░░░░░░
          2:249 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:283 ░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
          `,
        compose(
          onlyMeta('meta.version.webpack >= 5'),
          assertCssAndSourceMapContent('main.b720d3274f34b01a782e.css'),
          outdent
        )`
          ./src/index.scss                                                                                   
          ---------------------------------------------------------------------------------------------------
          1:001 .some-class-name {⏎                         1:001 .some-class-name .another-class-name{░░░░░░
                  @import "feature/index.scss";⏎                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                                             
          ./src/feature/index.scss                                                                           
          ---------------------------------------------------------------------------------------------------
          2:003 ░░background-image: url("data:image/svg+xml 1:038 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░backgr
                ;charset=utf8,%3Csvg viewBox='0 0 30 30' xm       ound-image:url("data:image/svg+xml;charset=
                lns='http://www.w3.org/2000/svg'%3E%3Cpath        utf8,%3Csvg viewBox='0 0 30 30' xmlns='http
                stroke='red' stroke-width='2' stroke-lineca       ://www.w3.org/2000/svg'%3E%3Cpath stroke='r
                p='round' stroke-miterlimit='10' d='M4 7h22       ed' stroke-width='2' stroke-linecap='round'
                M4 15h22M4 23h22'/%3E%3C/svg%3E")░░░░░░░░░░        stroke-miterlimit='10' d='M4 7h22M4 15h22M
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       4 23h22'/%3E%3C/svg%3E")░░░░░░░░░░░░░░░░░░░
          2:249 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;⏎         1:283 ░░░░░░░░░░░░░░░░░░░░░░░░}░░░░░░░░░░░░░░░░░░
                }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
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
);
