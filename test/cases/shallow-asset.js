'use strict';

const {dirname, join} = require('path');
const sequence = require('promise-compose');
const outdent = require('outdent');

const {layer, unlayer, fs, env, cwd, exec} = require('test-my-cli');
const {assertExitCodeZero} = require('./lib/assert');
const {withEnvRebase} = require('./lib/higher-order');

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
            single-quoted: url('../images/img.jpg');
            double-quoted: url("../images/img.jpg");
            unquoted: url(../images/img.jpg);
            query: url(../images/img.jpg?query);
            hash: url(../images/img.jpg#hash);
          }
          `,
        'src/images/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      env({
        PATH: dirname(process.execPath),
        ENTRY: 'src/index.scss',
        SOURCES: ['/src/feature/index.scss', '/src/index.scss'],
        URLS: ['./images/img.jpg'],
        ABSOLUTE: withEnvRebase(['src/images/img.jpg']),
        ASSETS: ['d68e763c825dc0e388929ae1b375ce18.jpg'],
        FILES: true
      }),
      exec('npm install'),
      fs({
        'node_modules/resolve-url-loader': dirname(require.resolve('resolve-url-loader'))
      })
    ),
    assertExitCodeZero('npm install'),
    require('./common'),
    unlayer
  );
