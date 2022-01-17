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

exports.assertNoMessages = sequence(
  exports.assertStdout('console')(0)`resolve-url-loader:`,
  exports.assertStderr('node deprecation warning')(0)`\[DEP_RESOLVE_URL_LOADER[A-Z_]+\]`
);

exports.assertDeprecationWarning = (message= '') => exports.assertStderr('node deprecation warning')(1)`
  ^[^\n]*\[DEP_RESOLVE_URL_LOADER[A-Z_]+\][ ]DeprecationWarning:[ ]${message}
  `;

exports.assertMisconfigWarning = (message) => sequence(
  onlyMeta('meta.version.webpack == 4')(
    exports.assertStdout('webpack warning')(1)`
      ^[ ]*WARNING[^\n]*
      ([^\n]+\n){0,2}[^\n]*resolve-url-loader:[ ]*loader misconfiguration
      [ ]+${message}
      `
  ),
  onlyMeta('meta.version.webpack >= 5')(
    exports.assertStdout('webpack warning')(1)`
      1 WARNING in child compilations
      `
  )
);

exports.assertAssetError = exports.assertStdout('webpack "Can\'t resolve" error')(1)`
  ^[ ]*ERROR[^\n]*
  [ ]*Module build failed[^\n]*
  [ ]*ModuleBuildError: Module build failed[^\n]*
  [ ]*Error: Can't resolve[^\n]*
  `;
