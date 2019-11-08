/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const compose = require('compose-function');

const {mappingsToAbsolute, absoluteToObj, objToString} = require('./lib/sourcemap');

const mappingsToObj = compose(absoluteToObj, mappingsToAbsolute);

const toString = ({ width, mappings, content, sourcesContent }) => {
  const objects = mappingsToObj(mappings);
  return objToString(80, objects, content, sourcesContent);
};

module.exports = Object.assign(
  toString,
  require('./lib/sourcemap')
);
