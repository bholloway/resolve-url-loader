'use strict';

const ms = require('ms');
const {assign} = Object;

const joi = require('./joi');

exports.schema = {
  ttl: joi.alternatives().try(
    joi.string().msTime().required(),
    joi.bool().only(false).required()
  ).required()
};

/**
 * Create a multiton that will keep inactive instances only as long as the ttl does not expire.
 *
 * @param {{onEmpty:function}} options A hash of options
 * @return {{register:function, deregister:function, dispose:function}}
 */
exports.create = (options) => {
  joi.assert(
    options,
    joi.object({
      onEmpty: joi.func().arity(0).default(() => () => {})
    }).unknown(false).required()
  );
  const {onEmpty} = options;

  let timeout = 0;
  const instances = [];

  const invalidate = () => {
    clearTimeout(timeout);
    const soonestTime = instances
      .reduce((r, [t]) => isNaN(t) ? r : Math.min(r, t), Number.POSITIVE_INFINITY);

    if (isFinite(soonestTime)) {
      const onTimeout = () => {
        const now = Date.now();
        instances
          .filter(([t]) => (now >= t))
          .forEach((instance) => {
            const i = instances.indexOf(instance);
            instances.splice(i, 1).forEach(([_, {dispose}]) => dispose());
          });
        if (instances.length) {
          invalidate();
        } else {
          onEmpty();
        }
      };

      const delta = soonestTime - Date.now();
      timeout = setTimeout(onTimeout, delta);
    }
  };

  const register = (instance) => {
    joi.assert(
      instance,
      joi.object(assign({
        dispose: joi.func().arity(0).required()
      }, exports.schema)).unknown(false).required()
    );

    const {ttl} = instance;
    const item = [NaN, instance];

    const onActivity = ttl ?
      (v) => {
        item[0] = Date.now() + ms(ttl);
        invalidate();
        return v;
      } :
      (v) => v;

    instances.push(item);

    return onActivity;
  };

  const deregister = (instance) => {
    const i = instances.indexOf(instance);
    if (i >= 0) {
      instances.splice(i, 1);
    }
  };

  const dispose = () => {
    clearTimeout(timeout);
    instances
      .splice(0, instances.length)
      .forEach(([_, {dispose}]) => dispose());
    onEmpty();
  };

  return {register, deregister, dispose};
};
