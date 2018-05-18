'use strict';

const {dirname, join} = require('path');
const sequence = require('promise-compose');
const outdent = require('outdent');

const {layer, unlayer, fs, env, cwd, exec} = require('../test-my-cli');
const {assertExitCodeZero} = require('./lib/assert');

module.exports = (engineDir) =>
  sequence(
    layer(
      cwd('.'),
      fs({
        'package.json': join(engineDir, 'package.json'),
        'webpack.config.js': join(engineDir, './webpack.config.js'),
        'src/index.scss': outdent`
          @import "feature/index.scss";
          `,
        'src/feature/index.scss': outdent`
          .someclassname {
            single-quoted: url('img.jpg');
            double-quoted: url("img.jpg");
            unquoted: url(img.jpg);
            query: url(img.jpg?query);
            hash: url(img.jpg#hash);
          }
          `,
        'src/feature/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      env({
        PATH: dirname(process.execPath),
        ENTRY: 'src/index.scss',
        SOURCES: '["/src/feature/index.scss", "/src/index.scss"]'
      }),
      exec('npm install'),
      fs({
        'node_modules/resolve-url-loader': process.cwd()
      })
    ),
    assertExitCodeZero('npm install'),
    require('./lib/common'),
    unlayer
  );
