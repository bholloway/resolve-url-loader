'use strict';

const joi = require('../joi');

exports.env = joi.object()
  .pattern(/^[\w-]+$/, joi.string().allow('').required())
  .unknown(false);
