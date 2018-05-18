'use strict';

const {existsSync} = require('fs');
const {dirname, join, relative} = require('path');
const compose = require('compose-function');
const sequence = require('promise-compose');
const get = require('get-value');
const ms = require('ms');

const {isConsistent} = require('./util');
const {withFiles, withFileContent, withJson, withSourceMappingURL, withSplitCssAssets} =
  require('./hoc');

const {assert} = require('../../test-my-cli/index');

const subdir = ({root, cwd, env: {OUTPUT}}) => relative(root, join(cwd, dirname(OUTPUT)));

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

exports.assertWebpackOk = sequence(
  exports.assertExitCodeZero('webpack'),
  assert(({pass, fail}, {stdout, stderr}) => {
    console.log(stderr);
    const lines = stdout.split('\n');
    const start = lines.findIndex(line => /\bERROR\b/.test(line));
    if (start < 0) {
      pass('should be free from compile errors');
    } else {
      const end = lines.findIndex((line, i) => line.trim() === '' && i > start) || lines.length;
      const error = lines.slice(start, end).join('\n');
      return fail(error);
    }
  })
);

exports.assertContent = (expected) =>
  assertCss(({equal}, _, list) => {
    equal(list.length, 1, 'should yield a single css file');
    if (list.length) {
      const [{content}] = list;
      equal(content, expected, 'should yield expected css content');
    }
  });

exports.assertCssSourceMap = (isExpectedOrField) => sequence(
  assertCss(({ok, notOk}, _, list) => {
    if (list.length) {
      const [{sourceMappingURL}] = list;
      (isExpectedOrField ? ok : notOk)(
        sourceMappingURL,
        `should ${isExpectedOrField ? '' : 'NOT'} yield sourceMappingURL comment`
      );
    }
  }),
  assertSourceMap(({ok, notOk, deepLooseEqual}, exec, list) => {
    (isExpectedOrField ? ok : notOk)(
      list.length,
      `should ${isExpectedOrField ? '' : 'NOT'} yield css source-map file`
    );
    if ((typeof isExpectedOrField === 'string') && list.length) {
      const jsonText = get(exec, isExpectedOrField);
      if (jsonText) {
        const [{sources}] = list;
        const adjusted = sources.map((v) => v.endsWith('*') ? v.slice(0, -1) : v).sort();
        const expected = JSON.parse(get(exec, isExpectedOrField));
        deepLooseEqual(adjusted, expected, 'should yield expected source-map sources');
      }
    }
  })
);

exports.assertConsistentAssets = (n, ...caveats) =>
  assertCss(({equal, ok}, _, list) => {
    if (list.length) {
      const [{assets}] = list;
      equal(assets.length, n, `should yield ${n} assets`);
      ok(compose(isConsistent, ...caveats)(assets), 'should be only one actual asset');
    }
  });

exports.assertAssetPresent = (presentOrNot) =>
  assertCss(({ok, notOk}, _, list) => {
    if (list.length) {
      const [{base, assets}] = list;
      (presentOrNot ? ok : notOk)(
        existsSync(join(base, assets[0])),
        `should ${presentOrNot ? '' : 'NOT'} output the asset`
      );
    }
  });
