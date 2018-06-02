'use strict';

const joi = require('../joi');

exports.env = joi.object()
  .pattern(
    /^[\w-]+$/,
    joi.alternatives().try(
      joi.array().items(joi.string()),
      joi.string().allow(''),
      joi.bool(),
      joi.func()
    ).required()
  )
  .unknown(false);
