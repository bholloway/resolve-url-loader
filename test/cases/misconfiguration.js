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
const {devNormal, devBail, prodNormal, prodBail} = require('./common/aspects');

const splitWebpack1 = (a, b) => (context, ...rest) =>
  ((context.layer.meta.version.webpack < 2) ? a : b)(context, ...rest);

const testNormalAndSilent = (...items) =>
  sequence(...items, testSilent(...items));

const assertContentDev = compose(assertContent, outdent)`
  .some-class-name {
    display: none;
  }
  `;

const assertContentProd = compose(assertContent, trim)`
  .some-class-name{display:none}
  `;

const assertNoMessages = assertStdout()`
  ^[ ]*resolve-url-loader:
  `(0); /* jshint ignore:line */

const assertMisconfigWarning = (message) => assertStdout('warning')`
  ^[ ]*(WARNING|Module Warning)[^\n]*
  [ ]*(Error:[ ]*)?resolve-url-loader:[ ]*loader misconfiguration
  [ ]+${message}
  `(1); /* jshint ignore:line */

const assertMisconfigError = (message) => assertStdout('error')`
  ^[ ]*(ERROR|ModuleError)[^\n]*
  [ ]*(Error:[ ]*)?resolve-url-loader:[ ]*loader misconfiguration
  [ ]+${message}
  `([1, 2]); /* jshint ignore:line *//* some webpack versions repeat error with different header line */

const assertNonFunctionJoinError = assertMisconfigError(
  '"join" option must be a Function'
);

const assertWrongArityJoinError = assertMisconfigError(
  '"join" Function must take exactly 1 argument, an options hash'
);

const assertNonExistentRootError = assertMisconfigError(
  '"root" option must be an empty string or an absolute path to an existing directory'
);

const assertCssError = assertStdout('error')`
  ^[ ]*(ERROR|ModuleError)[^\n]*
  [ ]*(Error:[ ]*)?resolve-url-loader:[ ]*CSS error
  [ ]+This "engine" is designed to fail, for testing purposes only
  `([1, 2]); /* jshint ignore:line *//* some webpack versions repeat error with different header line */

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
    testAttempts(
      sequence(
        devNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"attempts" option is defunct'),
          assertContentDev
        ),
        prodNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"attempts" option is defunct'),
          assertContentProd
        )
      ),
      testSilent(
        devNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev
        ),
        prodNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd
        )
      )
    ),
    testIncludeRoot(
      sequence(
        devNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"includeRoot" option is defunct'),
          assertContentDev
        ),
        prodNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"includeRoot" option is defunct'),
          assertContentProd
        )
      ),
      testSilent(
        devNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev
        ),
        prodNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentProd
        )
      )
    ),
    testFail(
      sequence(
        devNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"fail" option is defunct'),
          assertContentDev
        ),
        prodNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"fail" option is defunct'),
          assertContentProd
        )
      ),
      testSilent(
        devNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev
        ),
        prodNormal(
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
          devNormal(
            assertWebpackOk,
            assertNonFunctionJoinError
          ),
          devBail(
            assertWebpackNotOk
          ),
          prodNormal(
            assertWebpackOk,
            assertNonFunctionJoinError
          ),
          prodBail(
            assertWebpackNotOk
          )
        ),
        testNormalAndSilent(
          devNormal(
            assertWebpackNotOk,
            assertNonFunctionJoinError
          ),
          prodNormal(
            assertWebpackNotOk,
            assertNonFunctionJoinError
          )
        )
      )
    ),
    testWrongArityJoin(
      splitWebpack1(
        testNormalAndSilent(
          devNormal(
            assertWebpackOk,
            assertWrongArityJoinError
          ),
          devBail(
            assertWebpackNotOk
          ),
          prodNormal(
            assertWebpackOk,
            assertWrongArityJoinError
          ),
          prodBail(
            assertWebpackNotOk
          )
        ),
        testNormalAndSilent(
          devNormal(
            assertWebpackNotOk,
            assertWrongArityJoinError
          ),
          prodNormal(
            assertWebpackNotOk,
            assertWrongArityJoinError
          )
        )
      )
    ),
    testNonStringRoot(
      sequence(
        devNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"root" option must be string where used or false where unused'),
          assertContentDev
        ),
        prodNormal(
          assertWebpackOk,
          assertNoErrors,
          assertMisconfigWarning('"root" option must be string where used or false where unused'),
          assertContentProd
        )
      ),
      testSilent(
        devNormal(
          assertWebpackOk,
          assertNoErrors,
          assertNoMessages,
          assertContentDev
        ),
        prodNormal(
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
          devNormal(
            assertWebpackOk,
            assertNonExistentRootError
          ),
          devBail(
            assertWebpackNotOk
          ),
          prodNormal(
            assertWebpackOk,
            assertNonExistentRootError
          ),
          prodBail(
            assertWebpackNotOk
          )
        ),
        testNormalAndSilent(
          devNormal(
            assertWebpackNotOk,
            assertNonExistentRootError
          ),
          prodNormal(
            assertWebpackNotOk,
            assertNonExistentRootError
          )
        )
      )
    ),
    testEngineFail(
      splitWebpack1(
        testNormalAndSilent(
          devNormal(
            assertWebpackOk,
            assertCssError
          ),
          devBail(
            assertWebpackNotOk
          ),
          prodNormal(
            assertWebpackOk,
            assertCssError
          ),
          prodBail(
            assertWebpackNotOk
          )
        ),
        testNormalAndSilent(
          devNormal(
            assertWebpackNotOk,
            assertCssError
          ),
          prodNormal(
            assertWebpackNotOk,
            assertCssError
          )
        )
      )
    )
  )
);
