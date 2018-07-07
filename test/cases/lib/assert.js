'use strict';

const {existsSync, appendFileSync, mkdirSync} = require('fs');
const {join, relative} = require('path');
const compose = require('compose-function');
const sequence = require('promise-compose');
const ms = require('ms');
const get = require('get-value');
const has = require('has-prop');
const outdent = require('outdent');
const escapeString = require('escape-string-regexp');
const {assert} = require('test-my-cli');
const {assign} = Object;

const {excludingQuotes, unique} = require('./util');
const {withFiles, withFileContent, withJson, withSourceMappingURL, withSplitCssAssets} = require('./higher-order');

const subdir = ({root, cwd, env: {OUTPUT}}) =>
  relative(root, join(cwd, OUTPUT));

const resolveValue = (context, candidate) =>
  (typeof candidate === 'function') ? candidate(context) :
    (typeof candidate === 'string') && has(context, candidate) ? get(context, candidate) :
      candidate;

const assertCss = compose(
  assert,
  withFiles({ext: 'css', subdir}),
  withFileContent,
  withSourceMappingURL,
  withSplitCssAssets
);

const assertSourceMap = compose(
  assert,
  withFiles({ext: 'css.map', subdir}),
  withFileContent,
  withJson
);

exports.assertExitCodeZero = (message) =>
  assert(({pass, fail}, {code, stderr, time}) =>
    (code === 0) ? pass(`${message} (${ms(Math.round(time), {long: true})})`) : fail(stderr)
  );

exports.assertExitCodeNonZero = (message) =>
  assert(({pass, fail}, {code}) =>
    (code === 0) ? fail(`${message} unexpectantly exited cleanly`) : pass(`${message} should not exit cleanly`)
  );

exports.assertWebpackOk = exports.assertExitCodeZero('webpack');

exports.assertWebpackNotOk = exports.assertExitCodeNonZero('webpack');

exports.assertNoErrors = assert(({pass, fail}, {stdout}) => {
  const lines = stdout.split('\n');
  const start = lines.findIndex(line => /\bERROR\b/.test(line));
  if (start < 0) {
    pass('should be free of compile errors');
  } else {
    const end = lines.findIndex((line, i) => line.trim() === '' && i > start) || lines.length;
    const error = lines.slice(start, end).join('\n');
    return fail(error);
  }
});

exports.saveOutput = assert((_, exec) => {
  const {root, stdout, stderr} = exec;
  const directory = join(root, subdir(exec));
  if (!existsSync(directory)) {
    mkdirSync(directory);
  }
  appendFileSync(join(directory, 'stdout.txt'), stdout);
  appendFileSync(join(directory, 'stderr.txt'), stderr);
});

exports.assertContent = (fieldOrExpected) =>
  assertCss(({equal}, context, list) => {
    const expected = resolveValue(context, fieldOrExpected);
    equal(list.length, 1, 'should yield a single css file');
    if (list.length) {
      const [{content}] = list;
      equal(content, expected, 'should yield expected css content');
    }
  });

exports.assertCssSourceMap = (fieldOrExpected) => sequence(
  assertCss(({ok, notOk}, context, list) => {
    if (list.length) {
      const [{sourceMappingURL}] = list;
      const expected = resolveValue(context, fieldOrExpected);
      (expected ? ok : notOk)(
        sourceMappingURL,
        `should ${fieldOrExpected ? '' : 'NOT'} yield sourceMappingURL comment`
      );
    }
  }),

  assertSourceMap(({ok, notOk}, context, list) => {
    const expected = resolveValue(context, fieldOrExpected);
    (expected ? ok : notOk)(
      list.length,
      `should ${fieldOrExpected ? '' : 'NOT'} yield css source-map file`
    );
  }),

  assertSourceMap(({deepLooseEqual, pass}, context, list) => {
    if (list.length) {
      const expected = resolveValue(context, fieldOrExpected);
      if (expected) {
        const [{sources}] = list;
        const adjusted = sources.map((v) => v.endsWith('*') ? v.slice(0, -1) : v).sort();
        deepLooseEqual(adjusted, expected, 'should yield expected source-map sources');
      } else {
        pass('should NOT expect source-map sources');
      }
    }
  })
);

exports.assertAssetUrls = (fieldOrExpected) =>
  assertCss(({deepLooseEqual, pass}, context, list) => {
    const transform = compose(unique, excludingQuotes);
    if (list.length) {
      const expected = resolveValue(context, fieldOrExpected);
      if (expected) {
        const [{assets}] = list;
        deepLooseEqual(transform(assets), transform(expected), 'should yield expected url statements');
      } else {
        pass('should NOT expect any url statements');
      }
    }
  });

exports.assertAssetFiles = (fieldOrExpected) =>
  assertCss(({ok, pass, fail}, context, list) => {
    if (list.length) {
      const expected = resolveValue(context, fieldOrExpected);
      const [{base}] = list;
      if (!expected) {
        pass('should NOT expect any assets');
      } else {
        ok(unique(expected).every((filename) => existsSync(join(base, filename))), 'should output all assets');
      }
    }
  });

exports.assertStdout = (kind) => (strings, ...substitutions) => {
  const getRaw = () => [].concat(strings.raw || strings);
  const text = assign(getRaw(), {raw: getRaw()});
  const source = outdent(text, ...substitutions.map(v => escapeString(v)));
  const pattern = new RegExp(source, 'gm');

  return (fieldOrExpected) => assert(({ok, equal}, context) => {
    const expected = resolveValue(context, fieldOrExpected);
    const matches = context.stdout.match(pattern) || [];
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
