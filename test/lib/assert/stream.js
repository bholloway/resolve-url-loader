'use strict';

const {existsSync, appendFileSync, mkdirSync} = require('fs');
const {join} = require('path');
const {assert} = require('test-my-cli');
const outdent = require('outdent');
const sequence = require('promise-compose');
const escapeString = require('escape-string-regexp');

const {assign} = Object;

const {onlyMeta} = require('./selective');
const {subdir} = require('./util');

const assertStream = (stream) => (kind) => (expected) => (strings, ...substitutions) => {
  const raw = [].concat(strings.raw || strings);
  const text = assign(raw.slice(), {raw});
  const source = outdent(text, ...substitutions.map(v => escapeString(v)));

  return assert(({ok, equal}, exec) => {
    const pattern = new RegExp(source, 'gm');
    const matches = exec[stream].match(pattern) || [];
    if (!expected) {
      equal(matches.length, 0, ['should be free of', kind, 'messages'].filter(Boolean).join(' '));
    } else {
      const range = [].concat(expected);
      const first = range[0];
      const last = range[range.length - 1];
      ok(
        (matches.length >= first) && (matches.length <= last),
        [`should output ${range.join(' to ')}`, kind, 'messages'].filter(Boolean).join(' ')
      );
    }
  });
};

exports.saveOutput = (label) => assert((_, exec) => {
  const {root, stdout, stderr} = exec;
  const directory = join(root, subdir(exec));
  if (!existsSync(directory)) {
    mkdirSync(directory);
  }
  appendFileSync(join(directory, `${label}.stdout.txt`), stdout);
  appendFileSync(join(directory, `${label}.stderr.txt`), stderr);
});

exports.assertStdout = assertStream('stdout');

exports.assertStderr = assertStream('stderr');

exports.assertSilence = exports.assertStdout('console')(0)`resolve-url-loader:`;

exports.assertMisconfigWarning = (message) => exports.assertStdout('warning')(1)`
  ^[ ]*WARNING[^\n]*
  ([^\n]+\n){0,2}[^\n]*resolve-url-loader:[ ]*loader misconfiguration
  [ ]+${message}
  `;

// Webpack may repeat errors with a header line taken from the parent loader so we allow range 1-2
exports.assertModuleNotFoundError = exports.assertStdout('"Module not found" error')([1, 2])`
  ^[ ]*ERROR[^\n]*
  [ ]*Module build failed(:|[^\n]*\n)[ ]*ModuleNotFoundError: Module not found:
  `;

exports.assertNoMessages = sequence(
  onlyMeta('meta.engine == "rework"')(
    exports.assertStdout('console')(1)`resolve-url-loader:`,
    exports.assertMisconfigWarning('the "rework" engine has been deprecated and will be removed in the next major version')
  ),
  onlyMeta('meta.engine == "postcss"')(
    exports.assertStdout('console')(0)`resolve-url-loader:`
  )
);
