'use strict';

const compose = require('compose-function');
const {assert} = require('test-my-cli');

const {withFiles, withFileContent, withSourceMappingURL} = require('../higher-order');
const {subdir} = require('./util');

exports.assertCssFiles = compose(
  assert,
  withFiles({ext: 'css', subdir})
);

exports.assertCssFile = (isExpected) =>
  exports.assertCssFiles(({equal}, exec, list) => {
    equal(
      list.length,
      Number(isExpected),
      `should ${isExpected ? '' : 'NOT'} yield single css file`
    );
  });

exports.assertSourceMapFiles = compose(
  assert,
  withFiles({ext: 'css.map', subdir})
);

exports.assertSourceMapFile = (isExpected) =>
  exports.assertSourceMapFiles(({equal}, exec, list) => {
    equal(
      list.length,
      Number(isExpected),
      `should ${isExpected ? '' : 'NOT'} yield single source-map file`
    );
  });

exports.assertSplitCssContentAndComment = compose(
  exports.assertCssFiles,
  withFileContent,
  withSourceMappingURL
);

exports.assertCssContent = (expected) =>
  exports.assertSplitCssContentAndComment(({equal}, exec, list) => {
    const [{content}] = list;
    equal(list.length, 1, 'should yield single css output file');
    equal(content, expected, 'should yield expected css content');
  });

exports.assertCssSourceMapComment = (isExpected) =>
  exports.assertSplitCssContentAndComment(({ok, notOk}, exec, list) => {
    if (list.length) {
      const [{sourceMappingURL}] = list;
      (isExpected ? ok : notOk)(
        sourceMappingURL,
        `should ${isExpected ? '' : 'NOT'} yield sourceMappingURL comment`
      );
    }
  });
