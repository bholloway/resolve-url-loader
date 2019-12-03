'use strict';

const {join, relative} = require('path');

exports.subdir = ({root, cwd, env: {OUTPUT}}) =>
  relative(root, join(cwd, OUTPUT));
