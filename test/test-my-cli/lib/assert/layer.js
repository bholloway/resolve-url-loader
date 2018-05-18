'use strict';

const joi = require('../joi');
const {assign} = Object;

const layerCommon = {
  undo: joi.func().required(),
  env: joi.func().optional(),
  cwd: joi.func().optional()
};

exports.layer = joi.object(assign({
  isSealed: joi.bool().required()
}, layerCommon)).unknown(false);

exports.unsealedLayer = joi.object(assign({
  isSealed: joi.bool().only(false).required()
}, layerCommon)).unknown(false);

exports.sealedLayer = joi.object(assign({
  isSealed: joi.bool().only(true).required()
}, layerCommon)).unknown(false);
