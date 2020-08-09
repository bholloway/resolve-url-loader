'use strict';

const sequence = require('promise-compose');

exports.onlyMeta = (equation) => (...fn) => {
  /*jshint evil:true */
  const predicate = new Function('cwd', 'env', 'meta', `return (${equation})`);
  return (context, ...rest) => {
    const {cwd, env, meta} = context.layer;
    const isPass = predicate(cwd, env, meta);
    if (typeof isPass !== 'boolean') {
      throw new Error(`predicate "${equation}" must evaluate to boolean.`);
    }
    return (isPass ? sequence(...fn) : (x => x))(context, ...rest);
  };
};

exports.onlyOS = (name) => (...fn) => {
  const isPass = (/^win(dows)?$/.test(name) === (process.platform === 'win32'));
  return isPass ? sequence(...fn) : (x => x);
};
