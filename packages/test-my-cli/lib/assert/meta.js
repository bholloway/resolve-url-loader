'use strict';

const joi = require('../joi');

exports.meta = joi.object()
  .pattern(/^[\w-]+$/, joi.any().required())
  .unknown(false);
