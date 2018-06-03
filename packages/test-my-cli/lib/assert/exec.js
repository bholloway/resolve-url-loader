'use strict';

const joi = require('../joi');
const {env} = require('./env');
const {meta} = require('./meta');

exports.exec = joi.object({
  root: joi.path().absolute().required(),
  cwd: joi.path().absolute().required(),
  env: env.required(),
  meta: meta.required(),
  time: joi.number().positive().required(),
  code: joi.number().integer().required(),
  stdout: joi.string().allow('').required(),
  stderr: joi.string().allow('').required()
}).unknown(false);
