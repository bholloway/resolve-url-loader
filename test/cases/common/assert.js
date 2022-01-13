'use strict';

const {join, isAbsolute} = require('path');
const {readdirSync} = require('fs');
const sequence = require('promise-compose');
const {env, exec, assert} = require('test-my-cli');

const {rebaseTo, rebaseToCwd, sanitisePath} = require('../../lib/higher-order');
const {assertCssFiles, assertSourceMapFiles, assertExitCodeZero, saveOutput} = require('../../lib/assert');

const rebaseToOutput = rebaseTo(
  ({root, cwd, env: {OUTPUT}}) => isAbsolute(cwd) ? join(cwd, OUTPUT) : join(root, cwd, OUTPUT)
);

const sanitiseSourceMappingUrl = (text, placeholder) =>
  text.replace(
    /(sourceMappingURL=\w+\.)([0-9a-z]+)|(\s+)([0-9a-z]+)(?=\.css\.map)/g,
    (_, p1, p2, p3, p4) => `${p1 || p3}${(p2 || p4).replace(/[0-9a-z]/g, placeholder)}`
  );

exports.assertCssAndSourceMapContent = (cssOutputFile) =>
  (expected) => {
    return sequence(
      assertCssFiles(({equal}, exec, list) => {
        equal(list.length, 1, 'should yield single css file');
        if (cssOutputFile) {
          const expected = rebaseToOutput(cssOutputFile)(exec);
          const [path] = list;
          equal(sanitisePath(path), expected, 'should yield css file at the expected path');
        }
      }),
      assertSourceMapFiles(({equal}, exec, list) => {
        equal(list.length, 1, 'should yield single source-map file');
        if (cssOutputFile) {
          const expected = rebaseToOutput(`${cssOutputFile}.map`)(exec);
          const [path] = list;
          equal(sanitisePath(path), expected, 'should yield source-map file at the expected path');
        }
      }),
      env({
        WIDTH: 100,
        READ: rebaseToOutput((outputDir) => join(
          outputDir,
          readdirSync(outputDir).filter((v) => v.endsWith(`.css`)).shift()
        )),
        WRITE: 'stdout',
        MAP_EXT: '.map',
        SOURCE_ROOT: rebaseToCwd('.'),
        SANITISE_SOURCES: false,
      }),
      exec('sourcemap-to-string'),
      assertExitCodeZero('sourcemap-to-string'),
      saveOutput('sourcemap-to-string'),
      assert(({equal}, exec) => {
        const {stdout} = exec;
        equal(
          sanitiseSourceMappingUrl(stdout.toString(), '□'),
          expected,
          'should match expected source-map'
        );
      })
    );
  };
