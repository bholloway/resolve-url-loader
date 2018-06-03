'use strict';

const {dirname, join} = require('path');
const sequence = require('promise-compose');
const outdent = require('outdent');
const {layer, unlayer, fs, env, meta, cwd, exec} = require('test-my-cli');

const {trim} = require('./lib/util');
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
          .anotherclassname {
            display: block;
          }
          `,
        'src/feature/index.scss': outdent`
          .someclassname {
            single-quoted: url('images/img.jpg');
            double-quoted: url("images/img.jpg");
            unquoted: url(images/img.jpg);
            query: url(images/img.jpg?query);
            hash: url(images/img.jpg#hash);
          }
          `,
        'src/feature/images/img.jpg': require.resolve('./assets/blank.jpg')
      }),
      env({
        PATH: dirname(process.execPath),
        ENTRY: 'src/index.scss'
      }),
      meta({
        SOURCES: ['/src/feature/index.scss', '/src/index.scss'],
        CONTENT_DEV: outdent`
          .someclassname {
            single-quoted: url($0);
            double-quoted: url($1);
            unquoted: url($2);
            query: url($3);
            hash: url($4);
          }
          
          .anotherclassname {
            display: block;
          }
          `,
        CONTENT_PROD: trim`
          .someclassname{single-quoted:url($0);double-quoted:url($1);unquoted:url($2);query:url($3);hash:url($4)}
          .anotherclassname{display:block}
          `,
        URLS: ['./feature/images/img.jpg'],
        ABSOLUTE: withEnvRebase(['src/feature/images/img.jpg']),
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
