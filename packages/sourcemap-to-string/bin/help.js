/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const outdent = require('outdent');

require('object.values').shim();

const {formatMultilineText} = require('../lib/text');
const table = require('../lib/table');

module.exports = (command, schema) => {
  const args = Object.values(schema)
    .filter(({arg}) => (arg !== 'help'))
    .map(({isOptional, arg, example}) =>
      [
        isOptional && '[',
        [`--${arg}`, example].filter(Boolean).join(' '),
        isOptional && ']'
      ].filter(Boolean).join('')
    )
    .join('\n');

  const usage = table({
    width: 80,
    indent: 2,
    gap: 2,
    pattern: [0, 1],
    formatCell: formatMultilineText
  })([
    [command, '--help'],
    [],
    [command, args]
  ]);

  const options = table({
    width: 80,
    indent: 2,
    gap: 2,
    pattern: [0, 0, 1],
    formatCell: formatMultilineText
  })([
    ['ARG', 'ENV', 'DESCRIPTION'],
    [],
    ...Object.values(schema).map(({arg, env, doc}) => [`--${arg}`, env || '', doc])
  ]);

  console.error(
    outdent`
    usage:

    ${usage}

    some arguments may be given by environment variable

    ${options}
    `
  );
};
