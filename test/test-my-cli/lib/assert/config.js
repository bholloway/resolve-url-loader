'use strict';

const joi = require('../joi');

exports.config = joi.object({
  debug: joi.debug().optional(),
  root: joi.path().absolute().required(),
  onActivity: joi.func().required()
}).unknown(true);
