'use strict';

const {dirname, join} = require('path');
const sequence = require('promise-compose');
const outdent = require('outdent');
const {layer, unlayer, fs, env, meta, cwd, exec} = require('test-my-cli');

const {trim} = require('./lib/util');
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
          .anotherclassname {
            display: block;
          }
          `,
        'src/feature/index.scss': outdent`
          .someclassname {
            single-quoted: url('http://google.com');
            double-quoted: url("http://google.com");
            unquoted: url(http://google.com);
            query: url(http://google.com?query);
            hash: url(http://google.com#hash);
          }
          `
      }),
      env({
        PATH: dirname(process.execPath),
        ENTRY: join('src', 'index.scss')
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
        URLS: ['"http://google.com"', 'http://google.com', 'http://google.com?query', 'http://google.com#hash'],
        ABSOLUTE: ['"http://google.com"', 'http://google.com', 'http://google.com?query', 'http://google.com#hash'],
        ASSETS: ['"http://google.com"', 'http://google.com', 'http://google.com?query', 'http://google.com#hash'],
        FILES: false
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
