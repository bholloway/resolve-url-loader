'use strict';

const {all, testDefault, testSilent} = require('./tests');
const {buildDevNormal, buildDevBail, buildProdNormal, buildProdBail} = require('./builds');
const {onlyMeta, assertWebpackOk, assertWebpackNotOk, assertStdout} = require('../../lib/assert');

// Allow 1-N errors
//  - webpack may repeat errors with a header line taken from the parent loader
const assertModuleNotFoundError = assertStdout('"Module not found" error')([1, 100])`
  ^[ ]*ERROR[^\n]*
  [ ]*Module build failed(:|[^\n]*\n)[ ]*ModuleNotFoundError: Module not found:
  `;

exports.moduleNotFound =
  all(testDefault, testSilent)(
    onlyMeta('meta.version.webpack ==1')(
      buildDevBail(
        assertWebpackNotOk
      ),
      buildDevNormal(
        assertWebpackOk,
        assertModuleNotFoundError
      ),
      buildProdBail(
        assertWebpackNotOk
      ),
      buildProdNormal(
        assertWebpackOk,
        assertModuleNotFoundError
      )
    ),
    onlyMeta('meta.version.webpack > 1')(
      buildDevNormal(
        assertWebpackNotOk,
        assertModuleNotFoundError
      ),
      buildProdNormal(
        assertWebpackNotOk,
        assertModuleNotFoundError
      )
    )
  );
