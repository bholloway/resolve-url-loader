/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const outdent = require('outdent');

const {formatMultilineText} = require('../lib/text');
const table = require('../lib/table');

module.exports = ({command, schema, visitConfig}) => {
  const values = [];
  visitConfig({
    doc: (_, node) => values.push(node) && null
  })(schema);

  const args = values
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
    ...values.map(({arg, env, doc}) => [`--${arg}`, env || '', doc])
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
