/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {basename} = require('path');

module.exports = filename => basename(filename).split('.').slice(0, -1).join('.');
