'use strict';

const {existsSync, appendFileSync, mkdirSync} = require('fs');
const {join, relative} = require('path');
const compose = require('compose-function');
const sequence = require('promise-compose');
const ms = require('ms');
const get = require('get-value');
const has = require('has-prop');
const {assert} = require('test-my-cli');

const {mappingsToString} = require('./sourcemap');
const {excludingQuotes, unique} = require('./util');
const {withPattern, withFiles, withFileContent, withJson, withSourceMappingURL, withSplitCssAssets} =
  require('./higher-order');

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

exports.onlyVersion = (equation) => (...fn) => {
  /*jshint evil:true */
  const predicate = new Function('version', `return version.${equation.replace(/\b=+\b/, '===')}`);
  return (context, ...rest) => {
    const isPass = predicate(context.layer.meta.version);
    return (isPass ? sequence(...fn) : (x => x))(context, ...rest);
  };
};

exports.onlyOS = (name) => (...fn) => {
  const isPass = (/^win(dows)?$/.test(name) === (process.platform === 'win32'));
  return isPass ? sequence(...fn) : (x => x);
};

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

exports.assertContent = (find, replace) => {
  const formatter = find ? (v) => v.split(find).join(replace) : (v) => v;

  return (fieldOrExpected) =>
    assertCss(({equal}, context, list) => {
      const expected = resolveValue(context, fieldOrExpected);
      equal(list.length, 1, 'should yield a single css file');
      if (list.length) {
        const [{content}] = list;
        equal(formatter(content), expected, 'should yield expected css content');
      }
    });
};

exports.assertSourceMapComment = (fieldOrExpected) =>
  assertCss(({ok, notOk}, context, list) => {
    if (list.length) {
      const [{sourceMappingURL}] = list;
      const expected = resolveValue(context, fieldOrExpected);
      (expected ? ok : notOk)(
        sourceMappingURL,
        `should ${fieldOrExpected ? '' : 'NOT'} yield sourceMappingURL comment`
      );
    }
  });

exports.assertSourceMapContent = (fieldOrExpected) => sequence(
  assertSourceMap(({ok, notOk}, context, list) => {
    const expected = resolveValue(context, fieldOrExpected);
    (expected ? ok : notOk)(
      list.length,
      `should ${fieldOrExpected ? '' : 'NOT'} yield css source-map file`
    );
  }),

  assertSourceMap(({deepLooseEqual, equal, pass}, context, list) => {
    if (list.length) {
      const expected = resolveValue(context, fieldOrExpected);
      if (expected) {
        const [{sources, mappings}] = list;
        const adjustedSources = sources.map((v) => v.endsWith('*') ? v.slice(0, -1) : v).sort();
        if (Array.isArray(expected)) {
          deepLooseEqual(
            adjustedSources,
            expected,
            'should yield expected source-map sources'
          );
        } else if (typeof expected === 'string') {
          equal(
            mappingsToString(mappings)(adjustedSources),
            expected,
            'should yield expected source-map mappings'
          );
        } else {
          throw new Error('expectation must be String|Array.<String>');
        }
      } else {
        pass('should NOT expect source-map sources');
      }
    }
  })
);

exports.assertNoSourceMap = sequence(
  exports.assertSourceMapComment(false),
  exports.assertSourceMapContent(false)
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

const assertStream = (stream) => (kind) => (fieldOrExpected) => withPattern(
  (pattern) => assert(({ok, equal}, context) => {
    const expected = resolveValue(context, fieldOrExpected);
    const matches = context[stream].match(pattern) || [];
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
  })
);

exports.assertStdout = assertStream('stdout');

exports.assertStderr = assertStream('stderr');

exports.assertNoMessages = exports.assertStdout()(0)`resolve-url-loader:`;
