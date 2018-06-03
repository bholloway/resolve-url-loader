'use strict';

const {existsSync} = require('fs');
const {join, relative} = require('path');
const compose = require('compose-function');
const sequence = require('promise-compose');
const ms = require('ms');
const {assert} = require('test-my-cli');

const {unique} = require('./util');
const {withFiles, withFileContent, withJson, withSourceMappingURL, withSplitCssAssets} = require('./higher-order');

const subdir = ({root, cwd, env: {OUTPUT}}) =>
  relative(root, join(cwd, OUTPUT));

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
    if ((mode === 'true') || /stdout/.test(mode)) {
      console.log(stdout);
    }
    if ((mode === 'true') || /stderr/.test(mode)) {
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

exports.assertContent = (field) =>
  assertCss(({equal}, {meta}, list) => {
    equal(list.length, 1, 'should yield a single css file');
    if (list.length) {
      const [{content}] = list;
      const expected = meta[field];
      equal(content, expected, 'should yield expected css content');
    }
  });

exports.assertCssSourceMap = (fieldOrFalse) => sequence(
  assertCss(({ok, notOk}, _, list) => {
    if (list.length) {
      const [{sourceMappingURL}] = list;
      (fieldOrFalse ? ok : notOk)(
        sourceMappingURL,
        `should ${fieldOrFalse ? '' : 'NOT'} yield sourceMappingURL comment`
      );
    }
  }),

  assertSourceMap(({ok, notOk}, _, list) =>
    (fieldOrFalse ? ok : notOk)(
      list.length,
      `should ${fieldOrFalse ? '' : 'NOT'} yield css source-map file`
    )
  ),

  assertSourceMap(({deepLooseEqual, pass}, {meta}, list) => {
    if (list.length) {
      const [{sources}] = list;
      if (fieldOrFalse) {
        const adjusted = sources.map((v) => v.endsWith('*') ? v.slice(0, -1) : v).sort();
        const expected = meta[fieldOrFalse];
        deepLooseEqual(adjusted, expected, 'should yield expected source-map sources');
      } else {
        pass('should NOT expect source-map sources');
      }
    }
  })
);

exports.assertAssetUrls = (fieldOrFalse, caveats = (x => x)) => {
  const transform = compose(unique, caveats);

  return assertCss(({deepLooseEqual, pass}, {meta}, list) => {
    if (list.length) {
      const [{assets}] = list;
      if (fieldOrFalse) {
        const expected = meta[fieldOrFalse];
        deepLooseEqual(transform(assets), transform(expected), 'should yield expected url statements');
      } else {
        pass('should NOT expect any url statements');
      }
    }
  });
};

exports.assertAssetFiles = (fieldOrFalse, caveats = (x => x)) => {
  const transform = compose(unique, caveats);

  return assertCss(({ok, pass, fail}, {meta}, list) => {
    const isActuallyExpected = !!fieldOrFalse && !!meta[fieldOrFalse];
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
