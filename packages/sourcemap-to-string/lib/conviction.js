/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const convict = require('convict');
const compose = require('compose-function');

require('object.entries').shim();

const isObject = candidate =>
  !!candidate && (typeof candidate === 'object');

const isObjectHash = candidate =>
  isObject(candidate) && (Object.getPrototypeOf(candidate) === Object.prototype);

const unique = (v, i, a) =>
  (a.indexOf(v) === i);

const visitConfig = visitor => {
  const inner = node =>
    Object.entries(node)
      .forEach(([key, value]) => {
        if (visitor.hasOwnProperty(key)) {
          node[key] = visitor[key](value, node) || value;
        }
        else if (isObjectHash(value)) {
          inner(value);
        }
      });
  return inner;
};

const execute = (fn, args) => {
  try {
    return [fn ? fn(...args) : null, null];
  } catch (error) {
    return [undefined, error];
  }
};

const bail = ([result, error]) => {
  if (error) {
    throw error;
  } else {
    return result;
  }
};

const toError = ([_, error]) =>
  error;

const createFormatCollection = () => {
  const formats = {};

  const executeAndBail = compose(bail, execute);
  const executeToError = compose(toError, execute);

  const create = (values) => {
    if (!values.every(({name}) => (typeof name === 'string'))) {
      throw new Error('expected "name" in formatter');
    }
    const name = values.map(({name}) => name).join('|');
    if (!(name in formats)) {
      formats[name] = ({
        name,
        coerce: (...args) => values
          .reduce((r, {parse}) => (r !== null) ? r : executeAndBail(parse, args), null) || null,
        validate: (...args) => {
          const errors = values
            .map(({validate}) => executeToError(validate, args))
            .filter(v => isObject(v) && (v instanceof Error))
            .map(({message}) => message);

          if (errors.length === values.length) {
            throw new Error(errors.filter(unique).join(' OR '));
          }
        }
      });
    }
    return name;
  };

  return {create, formats};
};

module.exports = (config) => {
  const {create, formats} = createFormatCollection();

  visitConfig({
    default: (v, node) => {
      const result = isObjectHash(v) && v.default;
      node.isRequired = (result === null);
      node.isOptional = (result !== null);
      return result;
    },
    format: v => (typeof v === 'string') ? v : create([].concat(v))
  })(config);

  convict.addFormats(formats);

  const instance = convict(config);

  try {
    instance.validate({allowed: 'strict'});
  } catch ({message}) {
    instance.set(
      'errors',
      message
        .split('\n')
        .map(v => v.split(':').map(vv => vv.trim()))
        .reduce((r, [k, v]) => Object.assign(r, {[k]: v}), {})
    );
  }

  return {
    schema: instance.getSchema().properties,
    config: instance._instance,
  };
};
