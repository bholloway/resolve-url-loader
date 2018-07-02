'use strict';

const joi = require('../joi');

exports.config = joi.object({
  debug: joi.debug().optional(),
  onActivity: joi.func().required()
}).unknown(true);
