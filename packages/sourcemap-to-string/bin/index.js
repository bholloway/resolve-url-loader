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

const {config, schema} = require('../config');
const {errors, help} = config;

const command = process.argv[1]
  .split(/[\\\/]/)
  .pop();

if (help) {
  require('./help')(command, schema);
}
else if (errors) {
  require('./fail')(command, schema, errors);
}
else {
  require('./main')(config);
}
