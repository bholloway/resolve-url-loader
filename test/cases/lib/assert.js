'use strict';

const {existsSync} = require('fs');
const {dirname, join, relative} = require('path');
const compose = require('compose-function');
const sequence = require('promise-compose');
const get = require('get-value');
const ms = require('ms');

const {unique} = require('./util');
const {withFiles, withFileContent, withJson, withSourceMappingURL, withSplitCssAssets} = require('./hoc');

const {assert} = require('test-my-cli');

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

exports.assertCssSourceMap = (isExpectedOrField) => {
  const isExpected = !!isExpectedOrField;
  const field = (typeof isExpectedOrField === 'string') && isExpectedOrField;

  return sequence(
    assertCss(({ok, notOk}, _, list) => {
      if (list.length) {
        const [{sourceMappingURL}] = list;
        (isExpected ? ok : notOk)(
          sourceMappingURL,
          `should ${isExpectedOrField ? '' : 'NOT'} yield sourceMappingURL comment`
        );
      }
    }),

    assertSourceMap(({ok, notOk, deepLooseEqual}, exec, list) => {
      (isExpected ? ok : notOk)(
        list.length,
        `should ${isExpected ? '' : 'NOT'} yield css source-map file`
      );
      if (field && list.length) {
        const jsonText = get(exec, field);
        if (jsonText) {
          const [{sources}] = list;
          const adjusted = sources.map((v) => v.endsWith('*') ? v.slice(0, -1) : v).sort();
          const expected = JSON.parse(jsonText);
          deepLooseEqual(adjusted, expected, 'should yield expected source-map sources');
        }
      }
    })
  );
};

exports.assertAssetUrls = (field, caveats = (x => x)) => {
  const transform = compose(unique, caveats);

  return assertCss(({equal, ok, deepLooseEqual}, exec, list) => {
    if (field && list.length) {
      const jsonText = get(exec, field);
      if (jsonText) {
        const [{assets}] = list;
        const expected = JSON.parse(jsonText);
        deepLooseEqual(transform(assets), transform(expected), 'should yield expected url statements');
      }
    }
  });
};

exports.assertAssetFiles = (isExpectedOrField, caveats = (x => x)) => {
  const transform = compose(unique, caveats);
  const isExpected = !!isExpectedOrField;
  const field = (typeof isExpectedOrField === 'string') && isExpectedOrField;

  return assertCss(({ok, notOk}, exec, list) => {
    const isActuallyExpected = field ? (get(exec, field) === 'true') : isExpected;
    if (list.length) {
      const [{base, assets}] = list;
      (isActuallyExpected ? ok : notOk)(
        transform(assets).every((asset) => existsSync(join(base, asset))),
        `should ${isExpected ? '' : 'NOT'} output all assets`
      );
    }
  });
};
