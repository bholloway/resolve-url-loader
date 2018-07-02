'use strict';

const {readdirSync} = require('fs');
const {join, basename} = require('path');
const {promisify} = require('es6-promisify');
const mkdirp = require('mkdirp');
const {keys, entries, assign} = Object;

const compose = require('compose-function');

const joi = require('../lib/joi');
const {safeRemoveDirSync} = require('../lib/fs');
const {sequence} = require('../lib/promise');
const {lens} = require('../lib/promise');
const {logger, indent} = require('../lib/string');
const {schema: multitonSchema, create: createMultiton} = require('../lib/multiton');
const {assertTape} = require('../lib/assert');

const NAME = basename(__filename).slice(0, -3);

const multitons = {};

exports.schema = {
  debug: joi.debug().optional()
};

/**
 * Initialise configuration for all operations.
 *
 * @param {object} options Options hash
 * @return {function(object):object} Pure function from tape test to test context
 */
exports.create = (options) => {

  // import schema for each operation
  const schemas = readdirSync(__dirname)
    .reduce((r, v) => {
      const name = v.slice(0, -3);
      return assign(r, {[name]: require(`./${name}`).schema});
    }, {});

  // assert options
  joi.assert(
    options,
    joi.object(assign(
      {
        directory: joi.array().ordered(
          joi.path().directory().required(),
          joi.path().relative().required(),
          joi.path().relative().required()
        ).required(),
        debug: joi.debug().optional()
      },
      multitonSchema,
      ...entries(schemas)
        .map(([k, schema]) => schema ? ({[k]: joi.object(schema).optional()}) : null)
        .filter(Boolean)
    )).unknown(false).required()
  );

  const {directory: [baseDir, tempDir, namedDir], ttl, debug} = options;
  const log = logger();
  const indented = compose(log, indent(2));

  const absTempDir = join(baseDir, tempDir);
  const absNamedDir = join(absTempDir, namedDir);

  log(`init: "${absNamedDir}"`);

  // we will keep different multitons for each temp directory
  if (absTempDir in multitons) {
    indented(`reuse multiton for path "${absTempDir}"`);
  } else {
    indented(`create multiton for path "${absTempDir}"`);
    multitons[absTempDir] = createMultiton({
      onEmpty: () => {
        // when a multiton becomes empty we can remove whatever portions of it are empty
        // this protects us where several tests share part of the temp path
        indented(`empty: removing ${absTempDir}`);
        safeRemoveDirSync(baseDir, tempDir);
      }
    });
  }

  // when an instance disposes we can remove the named directory
  const {register, deregister} = multitons[absTempDir];
  const instance = {
    ttl,
    dispose() {
      indented(`dispose: removing ${absNamedDir}`);
      deregister(instance);
      safeRemoveDirSync(absTempDir, namedDir);
    }
  };
  const onActivity = register(instance);

  const config = keys(schemas)
    .reduce((r, k) => assign(r, {
      [k]: assign({debug}, options[k], {onActivity})
    }), {});

  const layer = {
    index: 0,
    root: absNamedDir,
    register: () => {
      throw new Error('You must perform all operations within layer()');
    },
    unlayer: () => {
      indented('unlayer() completed down to original init()');
      return null;
    }
  };

  // maybe activate the logging based on debug flag for init
  log.activate(config[NAME].debug);

  /**
   * A function that accepts a tape test and creates a test context (that includes the test).
   *
   * @param {string} name The name of the test
   * @param {function} fn The test function
   * @return {function(object):Promise} A pure async function of the outer test
   */
  return sequence(
    onActivity,
    assertTape(`${NAME}() expected tape Test instance, ensure ${NAME} occurs once as first item`),
    (test) => ({test, config, layer}),
    lens('layer', null)(({root}) => promisify(mkdirp)(root))
  );
};
