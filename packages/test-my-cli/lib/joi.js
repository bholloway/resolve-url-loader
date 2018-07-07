'use strict';

const Joi = require('joi');
const {Test} = require('tape');

const {isAbsolute, normalize} = require('path');
const {existsSync, statSync} = require('fs');

module.exports = Joi
  .extend((instance) => ({
    base: instance.bool().strict(true),
    name: 'bool'
  }))
  .extend((instance) => ({
    base: instance.alternatives().try(instance.bool(), instance.func()),
    name: 'debug'
  }))
  .extend((instance) => ({
    base: instance.string(),
    name: 'path',
    language: {
      absolute: 'needs to be an normalised absolute path',
      relative: 'needs to be a normalised relative path with simple alphanumeric directory names',
      directory: 'needs to be an normalised absolute path to an existing directory'
    },
    rules: [
      {
        name: 'absolute',
        validate(params, value, state, options) {
          const isValid = isAbsolute(value) && (normalize(value) === value);
          if (isValid) {
            return value;
          } else {
            return this.createError('path.absolute', {v: value}, state, options);
          }
        }
      },
      {
        name: 'relative',
        validate(params, value, state, options) {
          const split = value.replace(/^\.($|[\\/])/, '').split(/[\\/]/);
          const isValid = (split.length === 1) && (split[0] === '') ||
            split.every((v) => /^(\.?\w[\w-_.]*)$/.test(v));
          if (isValid) {
            return value;
          } else {
            return this.createError('path.relative', {v: value}, state, options);
          }
        }
      },
      {
        name: 'directory',
        validate(params, value, state, options) {
          const isValid = isAbsolute(value) && (normalize(value) === value) &&
            existsSync(value) && statSync(value).isDirectory();
          if (isValid) {
            return value;
          } else {
            return this.createError('path.directory', {v: value}, state, options);
          }
        }
      }
    ]
  }))
  .extend((instance) => ({
    base: instance.string(),
    name: 'string',
    language: {
      msTime: 'needs to be a numeric time with hour, minutes, or seconds suffix'
    },
    rules: [
      {
        name: 'msTime',
        validate(params, value, state, options) {
          if (/^\w[\w-_.]*$/.test(value)) {
            return value;
          } else {
            return this.createError('string.msTime', {v: value}, state, options);
          }
        }
      }
    ]
  }))
  .extend((instance) => ({
    base: instance.object(),
    name: 'test',
    language: {
      instanceofTape: 'needs to be a tape Test instance'
    },
    rules: [
      {
        name: 'instanceofTape',
        validate(params, value, state, options) {
          if (value instanceof Test) {
            return value;
          } else {
            return this.createError('object.tapeTest', {v: value}, state, options);
          }
        }
      }
    ]
  }));
