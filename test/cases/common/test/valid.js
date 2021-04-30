'use strict';

const sequence = require('promise-compose');
const {test, layer, meta, env} = require('test-my-cli');

const {assertStderr} = require('../../../lib/assert');
const {escapeStr} = require('../../../lib/util');

exports.testBase = (engine) => (...elements) =>
  test(
    `engine=${engine}`,
    layer(engine)(
      meta({
        engine
      }),
      env({
        DEVTOOL: true,
        LOADER_OPTIONS: (engine === 'postcss') ? {sourceMap: true} : {sourceMap: true, engine},
        LOADER_JOIN: '',
        CSS_OPTIONS: {sourceMap: true}
      }),
      ...elements,
      test('validate', sequence(
        assertStderr('options.sourceMap')(1)`sourceMap: true`,
        assertStderr('options.engine')(1)`engine: "${engine}"`
      ))
    )
  );

exports.testWithLabel = (label) => (...elements) =>
  test(
    label,
    layer()(
      env({
        OUTPUT: label
      }),
      ...elements
    )
  );

exports.testDefault = exports.testWithLabel('default');

exports.testDebug = (...elements) =>
  test(
    'debug=true',
    layer()(
      env({
        LOADER_OPTIONS: {debug: true},
        OUTPUT: 'debug'
      }),
      ...elements,
      test('validate', assertStderr('options.debug')(1)`debug: true`)
    )
  );

exports.testRemoveCR = (removeCR) => (...elements) =>
  test(
    `removeCR=${removeCR}`,
    layer()(
      env({
        LOADER_OPTIONS: {removeCR},
        OUTPUT: `remove-cr-${removeCR}`
      }),
      ...elements,
      test('validate', assertStderr('options.removeCR')(1)`removeCR: ${String(removeCR)}`)
    )
  );

exports.testRoot = (useRoot) => (...elements) =>
  test(
    `root=${JSON.stringify(useRoot)}`,
    layer()(
      env({
        LOADER_OPTIONS: (useRoot === true) ? (({root}) => ({root})) : ({root: useRoot}),
        OUTPUT: `root-${typeof useRoot}-${useRoot === '' ? 'empty' : JSON.stringify(useRoot).replace(/^"|"$/g, '')}`
      }),
      ...elements,
      test('validate',
        (useRoot === true) ?
          assertStderr('options.root')(1)`root: "${escapeStr(process.cwd())}[^"]+"` :
          assertStderr('options.root')(1)`root: ${JSON.stringify(useRoot)}`
      )
    )
  );
