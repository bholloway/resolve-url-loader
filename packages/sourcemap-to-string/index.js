/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const compose = require('compose-function');

const {mappingsToAbsolute, absoluteToObj, objToString} = require('./lib/sourcemap');

const mappingsToObj = compose(absoluteToObj, mappingsToAbsolute);

const toString = ({ width, mappings, content, sources, sourcesContent }) =>
  objToString(width, mappingsToObj(mappings), content, sources, sourcesContent);

module.exports = Object.assign(
  toString,
  require('./lib/sourcemap')
);
