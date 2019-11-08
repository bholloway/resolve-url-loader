/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {EOL} = require('os');

const vlq = require('vlq');
const compose = require('compose-function');
require('array.prototype.flatmap').shim();

const table = require('./table');
const {formatInt, formatSourceText, formatMultilineText} = require('./text');
const {repeatArray, aperture, last} = require('./array');

const findTuple = (list, [r1, c1]) =>
  list.find(([r2, c2]) => (r1 === r2) && (c1 === c2));

const uniqueTuple = (list) =>
  list.filter((v, i, a) => (findTuple(a, v) === v));

const visitTuples = (vistior) => (lines) =>
  lines
    .reduce(
      (r, line) => {
        const rr = line.reduce(
          (r, tuple, i) => {
            const single = vistior(tuple, r.offset, i);
            return {
              result: r.result.concat([single.value]),
              offset: single.offset
            };
          },
          {result: [], offset: r.offset}
        );

        return {
          result: r.result.concat([rr.result]),
          offset: rr.offset
        };
      },
      {result: [], offset: repeatArray(4, 0)}
    )
    .result;

exports.decodeMappings = (mappings) =>
  mappings.split(';')
    .map((line) => line ? line.split(',').map(vlq.decode) : []);

exports.encodeMappings = (lines) =>
  lines
    .map(segments => segments
      .map(vlq.encode)
      .join(',')
    )
    .join(';');

exports.deltaToAbsolute = visitTuples((delta, offset, i) => {
  const absolute = repeatArray(4, 0)
    .map((_, j) => {
      const k = Number(i > 0 || j > 0);
      return isNaN(delta[j]) ? offset[j] : (delta[j] + k * offset[j]);
    });

  return {
    value: absolute,
    offset: absolute
  };
});

exports.absoluteToDelta = visitTuples((absolute, offset, i) => {
  const delta = repeatArray(4, 0)
    .map((_, j) => {
      const k = Number(i > 0 || j > 0);
      return absolute[j] - k * offset[j];
    });

  return {
    value: delta,
    offset: absolute
  };
});

exports.mappingsToAbsolute = compose(exports.deltaToAbsolute, exports.decodeMappings);

exports.absoluteToMappings = compose(exports.encodeMappings, exports.absoluteToDelta);

exports.absoluteToObj = (absolute) =>
  absolute
    .reduce((list, segments, l2) => list.concat(
      segments.map(([c2, file, l1, c1]) => ({file, from: [l1 + 1, c1 + 1], to: [l2 + 1, c2 + 1]}))
    ), []);

exports.objToAbsolute = (objects) =>
  objects
    .reduce((lines, {file, from: [l1, c1], to: [l2, c2]}) => {
      while (lines.length < l2) {
        lines.push([]);
      }
      const end = lines[lines.length - 1];
      end.push([c2 - 1, file, l1 - 1, c1 - 1]);
      return lines;
    }, []);

exports.tuplesWithSubstring = (sortedTuples, text) => {
  const split = text.split(new RegExp(`(${EOL})`));

  const boundTuples = uniqueTuple([
    [1, 1],
    ...sortedTuples,
    [split.length, last(split).length + 1]
  ]);

  return aperture(2)(boundTuples)
    .map(([[l1, c1], [l2, c2]]) => {
      const splitStart = (l1 - 1) * 2;
      const splitStop  = (l2 - 1) * 2;
      const lastIndex  = splitStop - splitStart;
      const substring  = split
        .slice(splitStart, splitStop + 1)
        .reduce(
          (r, v, i) => {
            const m = (i === 0) ? (c1 - 1) : 0;
            const n = (i === lastIndex) ? (c2 - 1) : v.length;
            return r + v.slice(m, n);
          },
          ''
        );
      return [l1, c1, substring];
    });
};

exports.objToString = (maxWidth, objects, content, sources, sourcesContent) => {
  const toTuples = (field, predicate = null) => (text, i) =>
    exports.tuplesWithSubstring(
      objects
        .filter(v => !predicate || predicate(v, i))
        .map(({[field]: v}) => v)
        .sort(([l1, c1], [l2, c2]) => (l1 - l2) || (c1 - c2)),
      text
    );

  const outputTuples = toTuples('to')(content);

  const inputTuples = sourcesContent
    .map(toTuples('from', ({file}, i) => file === i));

  const tableForFile = table({
    width: maxWidth,
    pattern: [0, 0, 1, 0, 0, 1],
    padding: (col) => (col % 2 === 1) ? '░' : ' ',
    formatTable: (rows, widths) => rows.map((row) => [
      `${formatInt(row[0], widths[0])}:${formatInt(row[1], widths[1])}`,
      formatSourceText(row[1], row[2], widths[2]),
      `${formatInt(row[3], widths[3])}:${formatInt(row[4], widths[4])}`,
      formatSourceText(row[4], row[5], widths[5])
    ])
  });

  return objects
    .reduce(
      (r, { from, to, file }) => {
        r[file].push([
          ...findTuple(inputTuples[file], from),
          ...findTuple(outputTuples, to),
        ]);
        return r;
      },
      repeatArray(sourcesContent.length).map(() => [])
    )
    .map((obj, file) => [
        formatMultilineText(sources[file], maxWidth),
        ''.padEnd(maxWidth, '-'),
        tableForFile(obj)
      ].join('\n')
    )
    .join('\n\n');
};
