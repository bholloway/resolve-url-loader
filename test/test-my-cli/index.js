'use strict';

const {readdirSync} = require('fs');
const {join} = require('path');
const {assign} = Object;

// handle these events unless somebody else does
['uncaughtException', 'unhandledRejection'].forEach((event) => {
  process.on(event, (error) => {
    if (process.listenerCount(event) === 1) {
      console.error(error);
    }
  });
});

// the whole lib directory
const lib = readdirSync(join(__dirname, 'lib'))
  .filter((v) => v.endsWith('.js'))
  .reduce((r, v) => {
    const name = v.slice(0, -3);
    return assign(r, {[name]: require(`./lib/${name}`)});
  }, {});

// export create() function of each operation and lib
module.exports = readdirSync(join(__dirname, 'operations'))
  .filter((v) => v.endsWith('.js'))
  .reduce((r, v) => {
    const name = v.slice(0, -3);
    return assign(r, {[name]: require(`./operations/${name}`).create});
  }, {lib});
