'use strict';

const sequence = require('promise-compose');

const all = (...tests) => (...elements) =>
  sequence(...tests.map((test) => test(...elements)));

module.exports = Object.assign(
  {all},
  require('./valid'),
  require('./invalid')
);
