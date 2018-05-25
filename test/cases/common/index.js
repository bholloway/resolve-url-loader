'use strict';

const sequence = require('promise-compose');

module.exports = sequence(
  require('./default'),
  require('./keep-query')
);
