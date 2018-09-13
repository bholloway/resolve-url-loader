'use strict';

const joi = require('../joi');

const {config} = require('./config');
const {layer} = require('./layer');
const {exec} = require('./exec');

exports.context = joi.object({
  test: joi.test().instanceofTape().required(),
  config: joi.object().pattern(/.*/, config.required()).unknown(false).required(),
  layer: layer.required(),
  exec: exec.optional()
}).unknown(false);
