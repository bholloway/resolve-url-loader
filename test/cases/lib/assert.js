'use strict';

const {existsSync} = require('fs');
const {dirname, join, relative} = require('path');
const compose = require('compose-function');
const sequence = require('promise-compose');
const get = require('get-value');
const ms = require('ms');

const {unique} = require('./util');
const {withFiles, withFileContent, withJson, withSourceMappingURL, withSplitCssAssets} =
  require('./higher-order');

const {assert} = require('test-my-cli');

const subdir = ({root, cwd, env: {OUTPUT}}) =>
  relative(root, join(cwd, dirname(OUTPUT)));

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

exports.logOutput = (mode) =>
  assert((_, {stdout, stderr}) => {
    if ((mode === true) || /stdout/.test(mode)) {
      console.log(stdout);
    }
    if ((mode === true) || /stderr/.test(mode)) {
      console.log(stderr);
    }
  });

exports.assertWebpackOk = sequence(
  exports.assertExitCodeZero('webpack'),

  assert(({pass, fail}, {stdout}) => {
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

    assertSourceMap(({ok, notOk}, exec, list) =>
      (isExpected ? ok : notOk)(
        list.length,
        `should ${isExpected ? '' : 'NOT'} yield css source-map file`
      )
    ),

    assertSourceMap(({deepLooseEqual, pass}, exec, list) => {
      if (list.length) {
        const [{sources}] = list;
        if (field) {
          const jsonText = get(exec, field);
          if (jsonText) {
            const adjusted = sources.map((v) => v.endsWith('*') ? v.slice(0, -1) : v).sort();
            const expected = JSON.parse(jsonText);
            deepLooseEqual(adjusted, expected, 'should yield expected source-map sources');
          }
        } else {
          pass('should NOT expect source-map sources');
        }
      }
    })
  );
};

exports.assertAssetUrls = (field, caveats = (x => x)) => {
  const transform = compose(unique, caveats);

  return assertCss(({deepLooseEqual, pass}, exec, list) => {
    if (list.length) {
      const [{assets}] = list;
      if (field) {
        const jsonText = get(exec, field);
        if (jsonText) {
          const expected = JSON.parse(jsonText);
          deepLooseEqual(transform(assets), transform(expected), 'should yield expected url statements');
        }
      } else {
        pass('should NOT expect any url statements');
      }
    }
  });
};

exports.assertAssetFiles = (isExpectedOrField, caveats = (x => x)) => {
  const transform = compose(unique, caveats);
  const isExpected = !!isExpectedOrField;
  const field = (typeof isExpectedOrField === 'string') && isExpectedOrField;

  return assertCss(({ok, pass, fail}, exec, list) => {
    const isActuallyExpected = field ? (get(exec, field) === 'true') : isExpected;
    if (list.length) {
      const [{base, assets}] = list;
      if (!isActuallyExpected) {
        pass('should NOT expect any assets');
      } else if (assets.length) {
        ok(transform(assets).every((asset) => existsSync(join(base, asset))), 'should output all assets');
      } else {
        fail('should output all assets');
      }
    }
  });
};
