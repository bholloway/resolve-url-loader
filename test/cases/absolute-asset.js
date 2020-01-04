'use strict';

const {join} = require('path');
const outdent = require('outdent');
const compose = require('compose-function');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim, escapeStr} = require('../lib/util');
const {rebaseToCache} = require('../lib/higher-order');
const {all, testDefault, testDebug, testRoot, testWithLabel} = require('./common/test');
const {
  buildDevNormal, buildDevNoUrl, buildProdNormal, buildProdNoUrl, buildProdNoDevtool
} = require('./common/exec');
const {assertCssContent} = require('../lib/assert');
const {
  onlyOS, onlyMeta, assertWebpackOk, assertWebpackNotOk, assertNoErrors, assertNoMessages, assertStdout,
  assertCssSourceMapComment, assertCssFile, assertSourceMapFile, assertModuleNotFoundError
} = require('../lib/assert');

const assertDebugMessages = assertStdout('debug')(1)`
  ^resolve-url-loader:[^:]+:[ ]+${process.cwd()}.*${join('images', 'img.jpg')}
  [ ]+-empty-
  [ ]+FOUND$
  `;

module.exports = test(
  'absolute-asset',
  layer('absolute-asset')(
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
      'src/feature/index.scss': ({root}) => {
        const filePath = join(root, 'images', 'img.jpg');
        return outdent`
          .some-class-name {
            single-quoted: url('${escapeStr(filePath)}');
            double-quoted: url("${escapeStr(filePath)}");
            unquoted: url(${filePath});
            query: url(${filePath}?query);
            hash: url(${filePath}#hash);
          }
          `;
      }
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testWithLabel('asset-missing')(
      // absolute urls are not processed
      testRoot(false)(
        all(buildDevNormal, buildProdNormal)(
          onlyOS('posix')(
            assertWebpackOk
          ),
          onlyOS('windows')(
            assertWebpackNotOk,
            assertModuleNotFoundError
          )
        ),
        all(buildDevNoUrl, buildProdNoUrl)(
          assertWebpackOk
        )
      ),
      // absolute urls are processed
      testRoot('')(
        all(buildDevNormal, buildProdNormal)(
          assertWebpackNotOk,
          assertModuleNotFoundError
        ),
        all(buildDevNoUrl, buildProdNoUrl)(
          assertWebpackOk
        )
      )
    ),
    testWithLabel('asset-present')(
      fs({
        'images/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      // absolute urls are not processed
      testRoot(false)(
        // lack of debug messages in debug mode confirms the urls where not processed
        // if webpack passes it is incidental but lets check anyway
        testDebug(
          all(buildDevNormal, buildProdNormal)(
            onlyOS('posix')(
              assertWebpackOk,
              assertNoErrors,
              assertNoMessages
            ),
            onlyOS('windows')(
              onlyMeta('meta.version.webpack < 4')(
                assertWebpackOk,
                assertNoErrors,
                assertNoMessages
              ),
              // windows paths are not supported
              onlyMeta('meta.version.webpack == 4')(
                assertWebpackNotOk,
                assertModuleNotFoundError
              )
            )
          ),
          all(buildDevNoUrl, buildProdNoUrl)(
            assertWebpackOk,
            assertNoErrors,
            assertNoMessages
          )
        )
      ),
      // absolute urls are processed
      testRoot('')(
        testDebug(
          buildDevNormal(
            assertWebpackOk,
            assertNoErrors,
            assertDebugMessages,
            assertCssSourceMapComment(true),
            compose(onlyMeta('meta.engine == "rework"'), assertCssContent, outdent)`
              .some-class-name {
                single-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
                double-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
                unquoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
                query: url(d68e763c825dc0e388929ae1b375ce18.jpg);
                hash: url(d68e763c825dc0e388929ae1b375ce18.jpg#hash);
              }
              
              .another-class-name {
                display: block;
              }
              `,
            compose(onlyMeta('meta.engine == "postcss"'), assertCssContent, outdent)`
              .some-class-name {
                single-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
                double-quoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
                unquoted: url(d68e763c825dc0e388929ae1b375ce18.jpg);
                query: url(d68e763c825dc0e388929ae1b375ce18.jpg);
                hash: url(d68e763c825dc0e388929ae1b375ce18.jpg#hash); }
              
              .another-class-name {
                display: block; }
              `
          ),
          buildDevNoUrl(
            assertWebpackOk,
            assertNoErrors,
            assertDebugMessages,
            assertCssSourceMapComment(true),
            compose(onlyMeta('meta.engine == "rework"'), assertCssContent, outdent)`
              .some-class-name {
                single-quoted: url("../images/img.jpg");
                double-quoted: url("../images/img.jpg");
                unquoted: url(../images/img.jpg);
                query: url(../images/img.jpg?query);
                hash: url(../images/img.jpg#hash);
              }
              
              .another-class-name {
                display: block;
              }
              `,
            compose(onlyMeta('meta.engine == "postcss"'), assertCssContent, outdent)`
              .some-class-name {
                single-quoted: url("../images/img.jpg");
                double-quoted: url("../images/img.jpg");
                unquoted: url(../images/img.jpg);
                query: url(../images/img.jpg?query);
                hash: url(../images/img.jpg#hash); }
              
              .another-class-name {
                display: block; }
              `
          ),
          buildProdNormal(
            assertWebpackOk,
            assertNoErrors,
            assertDebugMessages,
            onlyMeta('meta.version.webpack < 4')(
              assertCssSourceMapComment(true)
            ),
            onlyMeta('meta.version.webpack == 4')(
              assertCssSourceMapComment(false)
            ),
            compose(assertCssContent, trim)`
              .some-class-name{single-quoted:url(d68e763c825dc0e388929ae1b375ce18.jpg);double-quoted:
              url(d68e763c825dc0e388929ae1b375ce18.jpg);unquoted:url(d68e763c825dc0e388929ae1b375ce18.jpg);query:
              url(d68e763c825dc0e388929ae1b375ce18.jpg);hash:url(d68e763c825dc0e388929ae1b375ce18.jpg#hash)}
              .another-class-name{display:block}
              `
          ),
          buildProdNoUrl(
            assertWebpackOk,
            assertNoErrors,
            assertDebugMessages,
            onlyMeta('meta.version.webpack < 4')(
              assertCssSourceMapComment(true),
              compose(assertCssContent, trim)`
                .some-class-name{single-quoted:url("../images/img.jpg");double-quoted:url("../images/img.jpg");unquoted:
                url(../images/img.jpg);query:url(../images/img.jpg?query);hash:url(../images/img.jpg#hash)}
                .another-class-name{display:block}
                `
            ),
            onlyMeta('meta.version.webpack == 4')(
              assertCssSourceMapComment(false),
              compose(assertCssContent, trim)`
                .some-class-name{single-quoted:url(../images/img.jpg);double-quoted:url(../images/img.jpg);unquoted:
                url(../images/img.jpg);query:url(../images/img.jpg?query);hash:url(../images/img.jpg#hash)}
                .another-class-name{display:block}
                `
            )
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
  )
);
