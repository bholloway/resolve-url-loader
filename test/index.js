'use strict';

const {join} = require('path');
const {readdirSync} = require('fs');
const sequence = require('promise-compose');
const micromatch = require('micromatch');
const tape = require('blue-tape');

const {init, test} = require('./test-my-cli');

const testIncluded = process.env.ONLY ?
  (...v) => {
    const patterns = process.env.ONLY.split(',').map(v => v.trim());
    return (micromatch(v, patterns).length >= patterns.length);
  } :
  () => true;

const ENGINES = readdirSync(join(__dirname, 'engines'));

const CASES = readdirSync(join(__dirname, 'cases'))
  .filter((v) => v.endsWith('.js'))
  .map((v) => v.split('.').shift());

const epoch = Math.round(Date.now() / 1000);

ENGINES
  .filter((engineName) => CASES.some((caseName) => testIncluded(engineName, caseName)))
  .forEach((engineName) => tape(
    engineName,
    sequence(
      init({
        directory: [process.cwd(), `tmp-${epoch}`, engineName],
        ttl: (process.env.KEEP !== 'true') && '1s',
        debug: (process.env.DEBUG === 'true'),
        env: {append: ['PATH']},
        unlayer: {inhibit: (process.env.KEEP === 'true')}
      }),
      sequence(
        ...CASES
          .filter((caseName) => testIncluded(engineName, caseName))
          .map((caseName) => test(
            caseName,
            require(`./cases/${caseName}`)(join(__dirname, 'engines', engineName))
          ))
      )
    )
  ));
