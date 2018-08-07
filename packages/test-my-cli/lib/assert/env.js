'use strict';

const joi = require('../joi');

exports.env = joi.object()
  .pattern(/^[\w-]+$/, joi.any().required())
  .unknown(false);
