'use strict';

const {dirname, join} = require('path');
const compose = require('compose-function');
const sequence = require('promise-compose');
const outdent = require('outdent');
const {layer, unlayer, fs, env, cwd, exec} = require('test-my-cli');

const {trim} = require('./lib/util');
const {
  assertExitCodeZero, assertContent, assertCssSourceMap, assertAssetUrls, assertAssetFiles, assertDebugMessages
} = require('./lib/assert');
const {withRebase} = require('./lib/higher-order');
const {testDefault, testAbsolute, testDebug, testKeepQuery} = require('./common/tests');
const {devNormal, devWithoutUrl, prodNormal, prodWithoutUrl, prodWithoutDevtool} = require('./common/aspects');

const assertContentDev = compose(assertContent, outdent)`
  .some-class-name {
    single-quoted: url($0);
    double-quoted: url($1);
    unquoted: url($2);
    query: url($3);
    hash: url($4);
  }
  
  .another-class-name {
    display: block;
  }
  `;

const assertContentProd = compose(assertContent, trim)`
  .some-class-name{single-quoted:url($0);double-quoted:url($1);unquoted:url($2);query:url($3);hash:url($4)}
  .another-class-name{display:block}
  `;

const assertSources = assertCssSourceMap([
  '/src/feature/index.scss',
  '/src/index.scss'
]);

const assertNoDebug = assertDebugMessages(/^resolve-url-loader/)(false);

const assertDebug = assertDebugMessages(/^resolve-url-loader/, /FOUND$/)([
  outdent`
    resolve-url-loader: ../images/img.jpg
      src/feature
      FOUND
    `
]);

module.exports = (engineDir) =>
  sequence(
    layer(
      cwd('.'),
      fs({
        'package.json': join(engineDir, 'package.json'),
        'webpack.config.js': join(engineDir, './webpack.config.js'),
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
          `,
        'src/images/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      env({
        PATH: dirname(process.execPath),
        ENTRY: join('src', 'index.scss')
      }),
      exec('npm install')
    ),
    assertExitCodeZero('npm install'),
    testDefault(
      devNormal(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      devWithoutUrl(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls(['./images/img.jpg']),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      prodWithoutUrl(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls(['./images/img.jpg']),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertNoDebug,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      )
    ),
    testAbsolute(
      devNormal(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      devWithoutUrl(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls(withRebase(['src/images/img.jpg'])),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      prodWithoutUrl(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls(withRebase(['src/images/img.jpg'])),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertNoDebug,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      )
    ),
    testDebug(
      devNormal(
        assertDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      devWithoutUrl(
        assertDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls(['./images/img.jpg']),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      prodWithoutUrl(
        assertDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls(['./images/img.jpg']),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertDebug,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls(['d68e763c825dc0e388929ae1b375ce18.jpg']),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      )
    ),
    testKeepQuery(
      devNormal(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      devWithoutUrl(
        assertNoDebug,
        assertContentDev,
        assertSources,
        assertAssetUrls([
          './images/img.jpg',
          './images/img.jpg?query',
          './images/img.jpg#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      ),
      prodWithoutUrl(
        assertNoDebug,
        assertContentProd,
        assertSources,
        assertAssetUrls([
          './images/img.jpg',
          './images/img.jpg?query',
          './images/img.jpg#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertNoDebug,
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'd68e763c825dc0e388929ae1b375ce18.jpg',
          'd68e763c825dc0e388929ae1b375ce18.jpg#hash'
        ]),
        assertAssetFiles(['d68e763c825dc0e388929ae1b375ce18.jpg'])
      )
    ),
    unlayer
  );
