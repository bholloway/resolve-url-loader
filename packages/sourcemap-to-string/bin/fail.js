/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const outdent = require('outdent');
const get = require('get-value');

require('object.entries').shim();

const {formatMultilineText} = require('../lib/text');
const table = require('../lib/table');

module.exports = ({command, schema, errors}) => {
  const message = table({
    width: 80,
    indent: 2,
    gap: 2,
    pattern: [0, 0, 1],
    formatCell: formatMultilineText
  })([
    ['ARG', 'ENV', 'EXPECTED'],
    [],
    ...Object.entries(errors)
      .map(([k, v]) => [k.split('.').join('.properties.'), v])
      .map(([k, v]) => [get(schema, k), v])
      .map(([{arg, env}, v]) => [`--${arg}`, env || '', v])
  ]);

  throw new Error(
    outdent`
    error in command-line options:

    ${message}

    for full usage run:
     
      ${command} --help
    `
  );
};
