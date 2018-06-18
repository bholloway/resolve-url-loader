'use strict';

const {dirname, join} = require('path');
const compose = require('compose-function');
const sequence = require('promise-compose');
const outdent = require('outdent');
const {layer, unlayer, fs, env, cwd, exec} = require('test-my-cli');

const {trim} = require('./lib/util');
const {
  assertExitCodeZero, assertContent, assertCssSourceMap, assertAssetUrls, assertAssetFiles
} = require('./lib/assert');
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
            single-quoted: url('http://google.com');
            double-quoted: url("http://google.com");
            unquoted: url(http://google.com);
            query: url(http://google.com?query);
            hash: url(http://google.com#hash);
          }
          `
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
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      devWithoutUrl(
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutUrl(
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      )
    ),
    testAbsolute(
      devNormal(
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      devWithoutUrl(
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutUrl(
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      )
    ),
    testDebug(
      devNormal(
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      devWithoutUrl(
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutUrl(
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      )
    ),
    testKeepQuery(
      devNormal(
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      devWithoutUrl(
        assertContentDev,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodNormal(
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutUrl(
        assertContentProd,
        assertSources,
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      ),
      prodWithoutDevtool(
        assertContentProd,
        assertCssSourceMap(false),
        assertAssetUrls([
          'http://google.com',
          'http://google.com?query',
          'http://google.com#hash'
        ]),
        assertAssetFiles(false)
      )
    ),
    unlayer
  );
