'use strict';

const {dirname, join} = require('path');
const {readdirSync} = require('fs');
const {platform} = require('process');
const sequence = require('promise-compose');
const micromatch = require('micromatch');
const tape = require('blue-tape');
const {init, layer, cwd, fs, env, exec} = require('test-my-cli');
const {assign} = Object;

const {assertExitCodeZero} = require('./cases/lib/assert');
const {testBase} = require('./cases/common/tests');

const testIncluded = process.env.ONLY ?
  (...v) => {
    const patterns = process.env.ONLY.split(' ').map(v => v.trim());
    return (micromatch(v, patterns).length >= patterns.length);
  } :
  () => true;

const epoch = Math.round(Date.now() / 1000).toString().padStart(10, 0);
console.log(`timestamp: ${epoch}`);

readdirSync(join(__dirname, 'engines'))
  .forEach((engineName) => {
    const engineDir = join(__dirname, 'engines', engineName);
    const cases = readdirSync(join(__dirname, 'cases'))
      .filter((v) => v.endsWith('.js'))
      .map((v) => v.split('.').shift())
      .filter((caseName) => testIncluded(engineName, caseName));

    cases.forEach((caseName) => console.log(engineName, caseName));

    if (cases.length) {

      // infer gross package versions in the engine name
      const version = engineName
        .match(/\b\w+\d\b/g)
        .reduce((r, v) => assign(r, {
          [v.slice(0, -1)]: parseInt(v.slice(-1))
        }), {});

      // common and/or cached node-modules cuts test time drastically
      const cacheDir = join(process.cwd(), 'tmp', '.cache', engineName);
      const engineFiles = readdirSync(engineDir)
        .reduce((hash, file) => assign(hash, {[file]: join(engineDir, file)}), {});

      tape(
        engineName,
        sequence(
          init({
            directory: [process.cwd(), join('tmp', '.cache'), engineName],
            ttl: false,
            debug: (process.env.DEBUG === 'true'),
            env: {
              merge: {
                'PATH': (...elements) => elements.join((platform === 'win32') ? ';' : ':')
              }
            },
            layer: {
              keep: true
            }
          }),
          layer()(
            cwd('.'),
            fs(engineFiles),
            env({
              PATH: dirname(process.execPath)
            }),
            exec('npm install'),
            assertExitCodeZero('npm install')
          )
        )
      );

      // test cases are a function of the cache directory
      tape(
        engineName,
        sequence(
          init({
            directory: [process.cwd(), join('tmp', epoch), engineName],
            ttl: (process.env.KEEP !== 'true') && '1s',
            debug: (process.env.DEBUG === 'true'),
            env: {
              merge: {
                'PATH': (...elements) => elements.join((platform === 'win32') ? ';' : ':'),
                '*QUERY': (...elements) => elements.join('&'),
                '*OPTIONS': (prev, next) => assign(JSON.parse(prev), next),
                'OUTPUT': (...elements) => elements.join('--')
              }
            },
            layer: {
              keep: (process.env.KEEP === 'true')
            }
          }),
          testBase(
            env({
              PATH: dirname(process.execPath)
            }),
            ...cases.map((caseName) => require(`./cases/${caseName}`)(cacheDir, version))
          )
        )
      );
    }
  });
