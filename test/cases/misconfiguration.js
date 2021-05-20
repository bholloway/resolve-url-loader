'use strict';

const {join} = require('path');
const outdent = require('outdent');
const sequence = require('promise-compose');
const compose = require('compose-function');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('../lib/util');
const {rebaseToCache} = require('../lib/higher-order');
const {
  all, testDefault, testSilent, testKeepQuery, testAbsolute, testAttempts, testEngineFailInitialisation,
  testEngineFailProcessing, testIncludeRoot, testFail, testNonFunctionJoin1, testWrongArityJoin1, testNonFunctionJoin2,
  testWrongArityJoin2, testNonStringRoot, testNonExistentRoot
} = require('./common/test');
const {buildDevNormal, buildProdNormal} = require('./common/exec');
const {assertCssContent} = require('../lib/assert');
const {
  assertWebpackOk, assertWebpackNotOk, assertNoErrors, assertStdout,
  assertSilence, assertMisconfigWarning, assertDeprecationWarning,
} = require('../lib/assert');

const assertContentDev = compose(assertCssContent, outdent)`
  .some-class-name {
    display: none; }
  `;

const assertContentProd = compose(assertCssContent, trim)`
  .some-class-name{display:none}
  `;

// Allow 1-4 errors
//  - known-issue in extract-text-plugin, failed loaders will rerun webpack>=2
//  - webpack may repeat errors with a header line taken from the parent loader
const assertMisconfigError = (message) => assertStdout('error')([1, 4])`
  ^[ ]*ERROR[^\n]*
  ([^\n]+\n){0,2}[^\n]*resolve-url-loader:[ ]*loader misconfiguration
  [ ]+${message}
  `;

// Allow 1-4 errors
//  - known-issue in extract-text-plugin, failed loaders will rerun webpack>=2
//  - webpack may repeat errors with a header line taken from the parent loader
const assertInitialisationError = assertStdout('error')([1, 4])`
  ^[ ]*ERROR[^\n]*
  ([^\n]+\n){0,2}[^\n]*resolve-url-loader:[ ]*error initialising
  [ ]+This "engine" is designed to fail at require time, for testing purposes only
  `;

// Allow 1-4 errors
//  - known-issue in extract-text-plugin, failed loaders will rerun webpack>=2
//  - webpack may repeat errors with a header line taken from the parent loader
const assertProcessingError = assertStdout('error')([1, 4])`
  ^[ ]*ERROR[^\n]*
  ([^\n]+\n){0,2}[^\n]*resolve-url-loader:[ ]*error processing CSS
  [ ]+This "engine" is designed to fail at processing time, for testing purposes only
  `;

module.exports = test(
  'misconfiguration',
  layer('misconfiguration')(
    cwd('.'),
    fs({
      'package.json': rebaseToCache('package.json'),
      'webpack.config.js': rebaseToCache('webpack.config.js'),
      'node_modules': rebaseToCache('node_modules'),
      'src/index.scss': outdent`
        .some-class-name {
          display: none;
        }
        `
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testEngineFailInitialisation(
      all(testDefault, testSilent)(
        all(buildDevNormal, buildProdNormal)(
          assertWebpackNotOk,
          assertInitialisationError
        )
      )
    ),
    testEngineFailProcessing(
      all(testDefault, testSilent)(
        all(buildDevNormal, buildProdNormal)(
          assertWebpackNotOk,
          assertProcessingError
        )
      )
    ),
    testAttempts(
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDeprecationWarning('"attempts" option has been removed'),
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDeprecationWarning('"attempts" option has been removed'),
          assertContentProd
        )
      ),
      testSilent(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSilence,
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSilence,
          assertContentProd
        )
      )
    ),
    testKeepQuery(
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDeprecationWarning('"keepQuery" option has been removed'),
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDeprecationWarning('"keepQuery" option has been removed'),
          assertContentProd
        )
      ),
      testSilent(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSilence,
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSilence,
          assertContentProd
        )
      )
    ),
    testAbsolute(
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDeprecationWarning('"absolute" option has been removed'),
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDeprecationWarning('"absolute" option has been removed'),
          assertContentProd
        )
      ),
      testSilent(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSilence,
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSilence,
          assertContentProd
        )
      )
    ),
    testIncludeRoot(
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDeprecationWarning('"includeRoot" option has been removed'),
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDeprecationWarning('"includeRoot" option has been removed'),
          assertContentProd
        )
      ),
      testSilent(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSilence,
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSilence,
          assertContentProd
        )
      )
    ),
    testFail(
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDeprecationWarning('"fail" option has been removed'),
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertDeprecationWarning('"fail" option has been removed'),
          assertContentProd
        )
      ),
      testSilent(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSilence,
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSilence,
          assertContentProd
        )
      )
    ),
    testNonFunctionJoin1(
      all(testDefault, testSilent)(
        all(buildDevNormal, buildProdNormal)(
          assertWebpackNotOk,
          assertMisconfigError('"join" option must be a Function')
        )
      )
    ),
    testWrongArityJoin1(
      all(testDefault, testSilent)(
        all(buildDevNormal, buildProdNormal)(
          assertWebpackNotOk,
          assertMisconfigError('"join" Function must take exactly 2 arguments (options, loader)')
        )
      )
    ),
    testNonFunctionJoin2(
      all(testDefault, testSilent)(
        all(buildDevNormal, buildProdNormal)(
          assertWebpackNotOk,
          assertMisconfigError('"join" option must itself return a Function when it is called')
        )
      )
    ),
    testWrongArityJoin2(
      all(testDefault, testSilent)(
        all(buildDevNormal, buildProdNormal)(
          assertWebpackNotOk,
          assertMisconfigError('"join" Function must create a function that takes exactly 1 arguments (item)')
        )
      )
    ),
    testNonStringRoot(
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"root" option must be string where used or false where unused'),
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"root" option must be string where used or false where unused'),
          assertContentProd
        )
      ),
      testSilent(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSilence,
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertSilence,
          assertContentProd
        )
      )
    ),
    testNonExistentRoot(
      all(testDefault, testSilent)(
        all(buildDevNormal, buildProdNormal)(
          assertWebpackNotOk,
          assertMisconfigError('"root" option must be an empty string or an absolute path to an existing directory')
        )
      )
    )
  )
);
