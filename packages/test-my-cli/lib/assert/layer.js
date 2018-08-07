'use strict';

const joi = require('../joi');
const {assign} = Object;

const layerCommon = {
  root: joi.path().directory().required(),
  register: joi.func().required(),
  unlayer: joi.func().required(),
  cwd: joi.path().relative().optional(),
  env: joi.object().optional(),
  meta: joi.object().optional()
};

exports.layer = joi
  .object(assign({
    index: joi.number().integer().min(0).required()
  }, layerCommon))
  .unknown(false);

exports.inLayer = joi
  .object(assign({
    index: joi.number().integer().min(1).required()
  }, layerCommon))
  .unknown(false);
