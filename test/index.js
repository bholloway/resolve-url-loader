'use strict';

const {join} = require('path');
const {readdirSync} = require('fs');
const {platform} = require('process');
const sequence = require('promise-compose');
const micromatch = require('micromatch');
const tape = require('blue-tape');
const {init} = require('test-my-cli');
const {assign} = Object;

const testIncluded = process.env.ONLY ?
  (...v) => {
    const patterns = process.env.ONLY.split(',').map(v => v.trim());
    return (micromatch(v, patterns).length >= patterns.length);
  } :
  () => true;

const epoch = Math.round(Date.now() / 1000);

readdirSync(join(__dirname, 'engines'))
  .reduce(
    (r, engineName) => readdirSync(join(__dirname, 'cases'))
      .filter((v) => v.endsWith('.js'))
      .map((v) => v.split('.').shift())
      .filter((caseName) => testIncluded(engineName, caseName))
      .reduce((rr, caseName) => rr.concat({engineName, caseName}), r),
    []
  )
  .forEach(({engineName, caseName}) => {
    console.log(engineName, caseName);
    tape(
      `${engineName}--${caseName}`,
      sequence(
        init({
          directory: [process.cwd(), 'tmp', `${epoch}--${engineName}--${caseName}`],
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
          unlayer: {
            inhibit: (process.env.KEEP === 'true')
          }
        }),
        require(`./cases/${caseName}`)(join(__dirname, 'engines', engineName))
      )
    );
  });
