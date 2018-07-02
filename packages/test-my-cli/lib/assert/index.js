'use strict';

const joi = require('../joi');
const {context} = require('./context');
const {exec} = require('./exec');
const {inLayer} = require('./layer');

const assertSchema = (...schemas) => {
  joi.assert(
    schemas,
    joi.array().items(joi.object().schema().required()).required()
  );

  return (title) => (...values) => {
    try {
      schemas.forEach((schema, i) => joi.assert(values[i], schema.required(), `arg[${i}]`));
    } catch (error) {
      throw new Error(`${title}: ${error}`);
    }
    return values[0];
  };
};
exports.assertSchema = assertSchema;

exports.assertTape = assertSchema(joi.test().instanceofTape());

exports.assertContext = assertSchema(context);

exports.assertExec = assertSchema(exec);

exports.assertInLayer = assertSchema(inLayer);
