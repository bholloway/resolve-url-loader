'use strict';

const {join} = require('path');
const outdent = require('outdent');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {withCacheBase} = require('../lib/higher-order');
const {testDefault, testAbsolute, testDebug, testKeepQuery} = require('./common/tests');
const {buildDevNormal, buildDevNoUrl, buildProdNormal, buildProdNoUrl, buildProdNoDevtool} = require('./common/builds');
const {assertWebpackOk, assertNoErrors, assertNoMessages} = require('../lib/assert');

module.exports = test(
  'orphan-carriage-return',
  layer('orphan-carriage-return')(
    cwd('.'),
    fs({
      'package.json': withCacheBase('package.json'),
      'webpack.config.js': withCacheBase('webpack.config.js'),
      'node_modules': withCacheBase('node_modules'),
      'src/index.scss': outdent`
        .some-class-name {
          font-size: calc(${'\r'}
            (1px)${'\r'}
          );
          background-image: url(data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==);
        }
        `
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testDefault(
      buildDevNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNoDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      )
    ),
    testAbsolute(
      buildDevNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNoDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      )
    ),
    testDebug(
      buildDevNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNoDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      )
    ),
    testKeepQuery(
      buildDevNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildDevNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNormal(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNoUrl(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      ),
      buildProdNoDevtool(
        assertWebpackOk,
        assertNoErrors,
        assertNoMessages
      )
    )
  )
);
