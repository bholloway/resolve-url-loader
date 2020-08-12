'use strict';

const {dirname, normalize, join} = require('path');
const {readdirSync} = require('fs');
const {platform: os} = require('process');
const compose = require('compose-function');
const sequence = require('promise-compose');
const micromatch = require('micromatch');
const tape = require('blue-tape');
const {init, layer, cwd, fs, env, meta, exec} = require('test-my-cli');
const {assign} = Object;

const {assertExitCodeZero, bail} = require('./lib/assert');
const {testBase} = require('./cases/common/test');

// tests are located in resolve-url-loader package which might differ from package under test
const PLATFORMS_DIR = compose(normalize, join)(__dirname, '..', 'packages', 'resolve-url-loader', 'test');
const CASES_DIR = join(__dirname, 'cases');

const testCaseVsEngine = ([_, engineName, caseName]) => {
  const split = caseName.split('.');
  return (split.length === 1) || (split[1] === engineName);
};

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
  readdirSync(PLATFORMS_DIR),
  ['rework', 'postcss'],
  readdirSync(CASES_DIR).filter((v) => v.endsWith('.js')).map((v) => v.split('.').slice(0, -1).join('.'))
)
  .filter(testCaseVsEngine)
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
    const platformDir = join(PLATFORMS_DIR, platform);
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
          exec('enforce-node-version'),
          assertExitCodeZero('enforce node version'),
          bail,
          exec('npm install'),
          assertExitCodeZero('npm install'),
          bail
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
          },
          fs: {
            debug: (process.env.DEBUG === 'fs')
          },
          exec: {
            debug: (process.env.DEBUG === 'exec')
          }
        }),
        ...filterTests(platform).map(engine =>
          testBase(engine)(
            env({
              PATH: dirname(process.execPath),
              RESOLVE_URL_LOADER_TEST_HARNESS: 'stderr'
            }),
            meta({
              cacheDir: join(process.cwd(), 'tmp', '.cache', platform),
              version: getVersionHash(platform)
            }),
            ...filterTests(platform, engine).map(caseName => require(join(CASES_DIR, caseName)))
          )
        )
      )
    );
  });
