'use strict';

const {join} = require('path');
const compose = require('compose-function');
const outdent = require('outdent');
const {test, layer, fs, env, cwd} = require('test-my-cli');

const {trim} = require('../lib/util');
const {
  onlyVersion, assertWebpackOk, assertWebpackNotOk, assertNoErrors, assertNoMessages, assertContent, assertStdout
} = require('../lib/assert');
const {
  all, testDefault, testSilent, testAttempts, testIncludeRoot, testFail, testNonFunctionJoin, testWrongArityJoin,
  testNonStringRoot, testNonExistentRoot, testEngineFail
} = require('./common/tests');
const {withCacheBase} = require('../lib/higher-order');
const {buildDevNormal, buildDevBail, buildProdNormal, buildProdBail} = require('./common/builds');

const assertContentDev = compose(assertContent(/;\s*}/g, ';\n}'), outdent)`
  .some-class-name {
    display: none;
  }
  `;

const assertContentProd = compose(assertContent(), trim)`
  .some-class-name{display:none}
  `;

const assertMisconfigWarning = (message) => assertStdout('warning')(1)`
  ^[ ]*WARNING[^\n]*
  ([^\n]+\n){0,2}[^\n]*resolve-url-loader:[ ]*loader misconfiguration
  [ ]+${message}
  `;

// Allow 1-4 errors
//  - known-issue in extract-text-plugin, failed loaders will rerun webpack>=2
//  - webpack may repeat errors with a header line taken from the parent loader
const assertMisconfigError = (message) => assertStdout('error')([1, 4])`
  ^[ ]*ERROR[^\n]*
  ([^\n]+\n){0,2}[^\n]*resolve-url-loader:[ ]*loader misconfiguration
  [ ]+${message}
  `;

const assertNonFunctionJoinError = assertMisconfigError(
  '"join" option must be a Function'
);

const assertWrongArityJoinError = assertMisconfigError(
  '"join" Function must take exactly 2 arguments (filename and options hash)'
);

const assertNonExistentRootError = assertMisconfigError(
  '"root" option must be an empty string or an absolute path to an existing directory'
);

// Allow 1-4 errors
//  - known-issue in extract-text-plugin, failed loaders will rerun webpack>=2
//  - webpack may repeat errors with a header line taken from the parent loader
const assertCssError = assertStdout('error')([1, 4])`
  ^[ ]*ERROR[^\n]*
  ([^\n]+\n){0,2}[^\n]*resolve-url-loader:[ ]*CSS error
  [ ]+This "engine" is designed to fail, for testing purposes only
  `;

module.exports = test(
  'misconfiguration',
  layer('misconfiguration')(
    cwd('.'),
    fs({
      'package.json': withCacheBase('package.json'),
      'webpack.config.js': withCacheBase('webpack.config.js'),
      'node_modules': withCacheBase('node_modules'),
      'src/index.scss': outdent`
        .some-class-name {
          display: none;
        }
        `
    }),
    env({
      ENTRY: join('src', 'index.scss')
    }),
    testEngineFail(
      all(testDefault, testSilent)(
        onlyVersion('webpack=1')(
          buildDevBail(
            assertWebpackNotOk
          ),
          buildDevNormal(
            assertWebpackOk,
            assertCssError
          ),
          buildProdBail(
            assertWebpackNotOk
          ),
          buildProdNormal(
            assertWebpackOk,
            assertCssError
          )
        ),
        onlyVersion('webpack>1')(
          buildDevNormal(
            assertWebpackNotOk,
            assertCssError
          ),
          buildProdNormal(
            assertWebpackNotOk,
            assertCssError
          )
        )
      )
    ),
    testAttempts(
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"attempts" option is defunct'),
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"attempts" option is defunct'),
          assertContentProd
        )
      ),
      testSilent(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd
        )
      )
    ),
    testIncludeRoot(
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"includeRoot" option is defunct'),
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"includeRoot" option is defunct'),
          assertContentProd
        )
      ),
      testSilent(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd
        )
      )
    ),
    testFail(
      testDefault(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"fail" option is defunct'),
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"fail" option is defunct'),
          assertContentProd
        )
      ),
      testSilent(
        buildDevNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd
        )
      )
    ),
    testNonFunctionJoin(
      all(testDefault, testSilent)(
        onlyVersion('webpack=1')(
          buildDevBail(
            assertWebpackNotOk
          ),
          buildDevNormal(
            assertWebpackOk,
            assertNonFunctionJoinError
          ),
          buildProdBail(
            assertWebpackNotOk
          ),
          buildProdNormal(
            assertWebpackOk,
            assertNonFunctionJoinError
          )
        ),
        onlyVersion('webpack>1')(
          buildDevNormal(
            assertWebpackNotOk,
            assertNonFunctionJoinError
          ),
          buildProdNormal(
            assertWebpackNotOk,
            assertNonFunctionJoinError
          )
        )
      )
    ),
    testWrongArityJoin(
      all(testDefault, testSilent)(
        onlyVersion('webpack=1')(
          buildDevBail(
            assertWebpackNotOk
          ),
          buildDevNormal(
            assertWebpackOk,
            assertWrongArityJoinError
          ),
          buildProdBail(
            assertWebpackNotOk
          ),
          buildProdNormal(
            assertWebpackOk,
            assertWrongArityJoinError
          )
        ),
        onlyVersion('webpack>1')(
          buildDevNormal(
            assertWebpackNotOk,
            assertWrongArityJoinError
          ),
          buildProdNormal(
            assertWebpackNotOk,
            assertWrongArityJoinError
          )
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
          assertNoMessages,
          assertContentDev
        ),
        buildProdNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd
        )
      )
    ),
    testNonExistentRoot(
      all(testDefault, testSilent)(
        onlyVersion('webpack=1')(
          buildDevBail(
            assertWebpackNotOk
          ),
          buildDevNormal(
            assertWebpackOk,
            assertNonExistentRootError
          ),
          buildProdBail(
            assertWebpackNotOk
          ),
          buildProdNormal(
            assertWebpackOk,
            assertNonExistentRootError
          )
        ),
        onlyVersion('webpack>1')(
          buildDevNormal(
            assertWebpackNotOk,
            assertNonExistentRootError
          ),
          buildProdNormal(
            assertWebpackNotOk,
            assertNonExistentRootError
          )
        )
      )
    )
  )
);
