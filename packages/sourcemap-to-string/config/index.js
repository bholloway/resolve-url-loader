/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

module.exports = require('../lib/conviction')({
  help: {
    arg: 'help',
    doc: 'Show usage instructions',
    format: 'Boolean',
    default: false
  },
  read: {
    arg: 'read',
    env: 'READ',
    example: '<file>',
    doc: 'Optional input filename (default "stdin")',
    format: [require('./stdin'), require('./extant-file')],
    default: require('./stdin')
  },
  write: {
    arg: 'write',
    env: 'WRITE',
    example: '<file>',
    doc: 'Optional output filename (default "stdout")',
    format: [require('./stdout'), require('./output-file')],
    default: require('./stdout')
  },
  map: {
    arg: 'map',
    env: 'MAP',
    example: '<file>',
    doc: 'Optional map file relative to input file (default ".")',
    format: [
      require('./extant-file-relative-to')('read'),
      require('./extant-file')
    ],
    default: undefined
  },
  sourceRoot: {
    arg: 'source-root',
    env: 'SOURCE_ROOT',
    example: '<directory>',
    doc: 'Optional sources-root directory relative to input file or cwd (default none)',
    format: [
      require('./extant-directory-relative-to')('read'),
      require('./extant-directory')
    ],
    default: undefined
  },
  width: {
    arg: 'width',
    env: 'WIDTH',
    example: '<int>',
    doc: 'Optional display width for output (default 80)',
    format: require('./natural-number'),
    default: 80
  }
});
