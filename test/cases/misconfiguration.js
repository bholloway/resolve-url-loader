'use strict';

const {join} = require('path');
const compose = require('compose-function');
const sequence = require('promise-compose');
const outdent = require('outdent');
const {test, layer, fs, env, cwd, meta} = require('test-my-cli');

const {trim} = require('./lib/util');
const {assertWebpackOk, assertWebpackNotOk, assertNoErrors, assertContent, assertStdout} = require('./lib/assert');
const {
  testSilent, testAttempts, testIncludeRoot, testFail, testNonFunctionJoin, testWrongArityJoin, testNonStringRoot,
  testNonExistentRoot, testEngineFail
} = require('./common/tests');
const {buildDevNormal, buildDevBail, buildProdNormal, buildProdBail} = require('./common/builds');

const splitWebpack1 = (a, b) => (context, ...rest) =>
  ((context.layer.meta.version.webpack < 2) ? a : b)(context, ...rest);

const testNormalAndSilent = (...items) =>
  sequence(...items, testSilent(...items));

const assertContentDev = compose(assertContent(/;\s*}/g, ';\n}'), outdent)`
  .some-class-name {
    display: none;
  }
  `;

const assertContentProd = compose(assertContent(), trim)`
  .some-class-name{display:none}
  `;

const assertNoMessages = assertStdout()(0)`resolve-url-loader:`;

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
  '"join" Function must take exactly 1 argument, an options hash'
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

module.exports = (cacheDir, version) => test(
  'misconfiguration',
  layer('misconfiguration')(
    meta({version}),
    cwd('.'),
    fs({
      'package.json': join(cacheDir, 'package.json'),
      'webpack.config.js': join(cacheDir, 'webpack.config.js'),
      'node_modules': join(cacheDir, 'node_modules'),
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
      splitWebpack1(
        testNormalAndSilent(
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
        testNormalAndSilent(
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
      sequence(
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
      sequence(
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
      sequence(
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
      splitWebpack1(
        testNormalAndSilent(
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
        testNormalAndSilent(
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
      splitWebpack1(
        testNormalAndSilent(
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
        testNormalAndSilent(
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
      sequence(
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
      splitWebpack1(
        testNormalAndSilent(
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
        testNormalAndSilent(
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
