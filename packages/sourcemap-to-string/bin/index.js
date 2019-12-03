#!/usr/bin/env node
'use strict';

const process = require('process');

const die = ({message, stack}) => {
  console.error(message);
  console.error(stack.split('\n').slice(0, 3).join('\n'));
  process.exit(1);
};

process.on('uncaughtException', die);
process.on('unhandledRejection', die);

const {config, schema, visitConfig} = require('../config');
const {errors, help} = config;

const command = process.argv[1]
  .split(/[\\\/]/)
  .pop();

new Promise((resolve, reject) => {
  if (help) {
    resolve(require('./help')({command, schema, visitConfig}));
  } else if (errors) {
    reject(require('./fail')({command, schema, errors}));
  } else {
    resolve(require('./main')(config));
  }
})
  .catch(die);
