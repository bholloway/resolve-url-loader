'use strict';

const sequence = require('promise-compose');
const {test, layer, unlayer, env, exec} = require('test-my-cli');

const {assertWebpackOk, saveOutput} = require('../lib/assert');

exports.devNormal = (...rest) =>
  test(
    'development-normal',
    sequence(
      layer(
        env({
          OUTPUT: 'development-normal'
        })
      ),
      exec('npm run webpack-d'),
      saveOutput,
      assertWebpackOk,
      ...rest,
      unlayer
    )
  );

exports.devWithoutUrl = (...rest) =>
  test(
    'development-without-url',
    sequence(
      layer(
        env({
          CSS_QUERY: 'url=false',
          CSS_OPTIONS: {url: false},
          OUTPUT: 'development-without-url'
        })
      ),
      exec('npm run webpack-d'),
      saveOutput,
      assertWebpackOk,
      ...rest,
      unlayer
    )
  );

exports.prodNormal = (...rest) =>
  test(
    'production-normal',
    sequence(
      layer(
        env({
          OUTPUT: 'production-normal'
        })
      ),
      exec(`npm run webpack-p`),
      saveOutput,
      assertWebpackOk,
      ...rest,
      unlayer
    )
  );

exports.prodWithoutUrl = (...rest) =>
  test(
    'production-without-url',
    sequence(
      layer(
        env({
          CSS_QUERY: 'url=false',
          CSS_OPTIONS: {url: false},
          OUTPUT: 'production-without-url'
        })
      ),
      exec(`npm run webpack-p`),
      saveOutput,
      assertWebpackOk,
      ...rest,
      unlayer
    )
  );

exports.prodWithoutDevtool = (...rest) =>
  test(
    'production-without-devtool',
    sequence(
      layer(
        env({
          DEVTOOL: false,
          OUTPUT: 'production-without-devtool'
        })
      ),
      exec(`npm run webpack-p`),
      saveOutput,
      assertWebpackOk,
      ...rest,
      unlayer
    )
  );
