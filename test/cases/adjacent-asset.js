'use strict';

const {dirname, join} = require('path');
const sequence = require('promise-compose');
const outdent = require('outdent');

const {layer, unlayer, fs, env, cwd, exec} = require('test-my-cli');
const {assertExitCodeZero} = require('./lib/assert');

module.exports = (engineDir) =>
  sequence(
    layer(
      cwd('packageA'),
      fs({
        'packageA/package.json': join(engineDir, 'package.json'),
        'packageA/webpack.config.js': join(engineDir, './webpack.config.js'),
        'packageA/src/index.scss': outdent`
          @import "feature/index.scss";
          `,
        'packageA/src/feature/index.scss': outdent`
          .someclassname {
            single-quoted: url('../../../packageB/images/img.jpg');
            double-quoted: url("../../../packageB/images/img.jpg");
            unquoted: url(../../../packageB/images/img.jpg);
            query: url(../../../packageB/images/img.jpg?query);
            hash: url(../../../packageB/images/img.jpg#hash);
          }
          `,
        'packageB/package.json': outdent`
          {
            "name": "packageB" 
          }
          `,
        'packageB/images/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      env({
        PATH: dirname(process.execPath),
        ENTRY: 'src/index.scss',
        SOURCES: '["/src/feature/index.scss", "/src/index.scss"]',
        URLS: '["../../packageB/images/img.jpg"]',
        ASSETS: '["d68e763c825dc0e388929ae1b375ce18.jpg"]',
        FILES: 'true'
      }),
      exec('npm install'),
      fs({
        'packageA/node_modules/resolve-url-loader': dirname(require.resolve('resolve-url-loader'))
      })
    ),
    assertExitCodeZero('npm install'),
    require('./common'),
    unlayer
  );
