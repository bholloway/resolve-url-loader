'use strict';

const {join, isAbsolute} = require('path');
const sequence = require('promise-compose');
const {env, exec, assert} = require('test-my-cli');

const {rebaseTo, rebaseToCwd, sanitisePath} = require('../../lib/higher-order');
const {assertCssFiles, assertSourceMapFiles, assertExitCodeZero, saveOutput} = require('../../lib/assert');

const rebaseToOutput = rebaseTo(
  ({root, cwd, env: {OUTPUT}}) => isAbsolute(cwd) ? join(cwd, OUTPUT) : join(root, cwd, OUTPUT)
);

exports.assertCssAndSourceMapContent = (cssOutputFile, {sourceRoot = '.', sanitiseSources = false} = {}) =>
  (expected) => {
    return sequence(
      assertCssFiles(({equal}, exec, list) => {
        const expected = rebaseToOutput(cssOutputFile)(exec);
        const [path] = list;
        equal(list.length, 1, 'should yield single css file');
        equal(sanitisePath(path), expected, 'should yield css file at the expected path');
      }),
      assertSourceMapFiles(({equal}, exec, list) => {
        const expected = rebaseToOutput(`${cssOutputFile}.map`)(exec);
        const [path] = list;
        equal(list.length, 1, 'should yield single source-map file');
        equal(sanitisePath(path), expected, 'should yield source-map file at the expected path');
      }),
      env({
        WIDTH: 100,
        READ: rebaseToOutput(cssOutputFile),
        WRITE: 'stdout',
        MAP_EXT: '.map',
        SOURCE_ROOT: rebaseToCwd(sourceRoot),
        SANITISE_SOURCES: !!sanitiseSources,
      }),
      exec('sourcemap-to-string'),
      assertExitCodeZero('sourcemap-to-string'),
      saveOutput('sourcemap-to-string'),
      assert(({equal}, exec) => {
        const {stdout} = exec;
        equal(
          stdout,
          expected,
          'should match expected source-map'
        );
      })
    );
  };
