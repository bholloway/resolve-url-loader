'use strict';

const {dirname, join} = require('path');
const {readdirSync} = require('fs');
const {platform: os} = require('process');
const sequence = require('promise-compose');
const micromatch = require('micromatch');
const tape = require('blue-tape');
const {init, layer, cwd, fs, env, exec} = require('test-my-cli');
const {assign} = Object;

const {assertExitCodeZero} = require('./cases/lib/assert');
const {testBase} = require('./cases/common/tests');

const testIncluded = process.env.ONLY ?
  (arr) => {
    const patterns = process.env.ONLY.split(' ').map(v => v.trim());
    return (micromatch(arr, patterns).length >= patterns.length);
  } :
  () => true;

const permute = (array, ...rest) =>
  (rest.length === 0) ?
    array.map(v => [v]) :
    array.reduce((r, v) => [...r, ...permute(...rest).map((vv) => [v, ...vv])], []);

const getVersionHash = platform =>
  platform
    .match(/\b\w+\d\b/g)
    .reduce((r, v) => assign(r, {
      [v.slice(0, -1)]: parseInt(v.slice(-1))
    }), {});

// isolate test by timestamp
const epoch = Math.round(Date.now() / 1000).toString().padStart(10, 0);
console.log(`timestamp: ${epoch}`);

// platforms, engines, cases
const tests = permute(
  readdirSync(join(__dirname, 'platforms')),
  ['rework', 'postcss'],
  readdirSync(join(__dirname, 'cases')).filter((v) => v.endsWith('.js')).map((v) => v.split('.').shift())
)
  .filter(testIncluded);

const filterTests = (...terms) =>
  tests
    .filter(test => test.slice(0, terms.length).join() === terms.join())
    .map(test => test[terms.length])
    .filter((v, i, a) => a.indexOf(v) === i);

// before we do anything show all tests that match the filter
tests.forEach((test) => console.log(...test));

filterTests()
  .forEach(platform => {
    // common and/or cached node-modules cuts test time drastically
    const platformDir = join(__dirname, 'platforms', platform);
    const platformFiles = readdirSync(platformDir)
      .reduce((r, file) => assign(r, {[file]: join(platformDir, file)}), {});

    tape(
      platform,
      sequence(
        init({
          directory: [process.cwd(), join('tmp', '.cache'), platform],
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
          fs(platformFiles),
          env({
            PATH: dirname(process.execPath)
          }),
          exec('npm install'),
          assertExitCodeZero('npm install')
        )
      )
    );

    // test cases are a function of the cache directory and the gross package versions
    tape(
      platform,
      sequence(
        init({
          directory: [process.cwd(), join('tmp', epoch), platform],
          ttl: (process.env.KEEP !== 'true') && '1s',
          debug: (process.env.DEBUG === 'true'),
          env: {
            merge: {
              'PATH': (...elements) => elements.join((os === 'win32') ? ';' : ':'),
              '*QUERY': (...elements) => elements.join('&'),
              '*OPTIONS': (prev, next) => assign(JSON.parse(prev), next),
              'OUTPUT': (...elements) => elements.join('--')
            }
          },
          layer: {
            keep: (process.env.KEEP === 'true')
          }
        }),
        ...filterTests(platform).map(engine =>
          testBase(engine)(
            env({
              PATH: dirname(process.execPath),
              RESOLVE_URL_LOADER_TEST_HARNESS: 'stderr'
            }),
            ...filterTests(platform, engine).map(caseName =>
              require(`./cases/${caseName}`)(
                join(process.cwd(), 'tmp', '.cache', platform),
                getVersionHash(platform)
              )
            )
          )
        )
      )
    );
  });
