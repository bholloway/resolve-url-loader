'use strict';

const {test, layer, env, exec} = require('test-my-cli');

const {saveOutput} = require('../lib/assert');

exports.devNormal = (...rest) =>
  test(
    'development-normal',
    layer()(
      env({
        OUTPUT: 'development-normal'
      }),
      exec('npm run webpack-d'),
      saveOutput,
      ...rest
    )
  );

exports.devWithoutUrl = (...rest) =>
  test(
    'development-without-url',
    layer()(
      env({
        CSS_QUERY: 'url=false',
        CSS_OPTIONS: {url: false},
        OUTPUT: 'development-without-url'
      }),
      exec('npm run webpack-d'),
      saveOutput,
      ...rest
    )
  );

exports.devBail = (...rest) =>
  test(
    'development-bail',
    layer()(
      env({
        OUTPUT: 'development-bail'
      }),
      exec('npm run webpack-d-bail'),
      saveOutput,
      ...rest
    )
  );

exports.prodNormal = (...rest) =>
  test(
    'production-normal',
    layer()(
      env({
        OUTPUT: 'production-normal'
      }),
      exec(`npm run webpack-p`),
      saveOutput,
      ...rest
    )
  );

exports.prodWithoutUrl = (...rest) =>
  test(
    'production-without-url',
    layer()(
      env({
        CSS_QUERY: 'url=false',
        CSS_OPTIONS: {url: false},
        OUTPUT: 'production-without-url'
      }),
      exec(`npm run webpack-p`),
      saveOutput,
      ...rest
    )
  );

exports.prodWithoutDevtool = (...rest) =>
  test(
    'production-without-devtool',
    layer()(
      env({
        DEVTOOL: false,
        OUTPUT: 'production-without-devtool'
      }),
      exec(`npm run webpack-p`),
      saveOutput,
      ...rest
    )
  );

exports.prodBail = (...rest) =>
  test(
    'production-bail',
    layer()(
      env({
        OUTPUT: 'production-bail'
      }),
      exec(`npm run webpack-p-bail`),
      saveOutput,
      ...rest
    )
  );
