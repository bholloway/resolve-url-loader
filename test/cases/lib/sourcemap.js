'use strict';

const vlq = require('vlq');
const compose = require('compose-function');
const {assign, values} = Object;

const {unique} = require('./util');

const zeros = (length) => (new Array(length)).fill(0);

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
      {result: [], offset: zeros(4)}
    )
    .result;

exports.decodeMappings = (mappings) =>
  mappings.split(';')
    .map((line) => line ? line.split(',').map(vlq.decode) : []);

exports.encodeMappings = (lines) =>
  lines
    .map(segments => segments
      .map(vlq.encode)
      .filter((v, i, a) => (v !== 'AAAA') || (a.length > 1) && (i === 0))
      .join(',')
    )
    .join(';');

exports.deltaToAbsolute = visitTuples((delta, offset, i) => {
  const absolute = zeros(4)
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
  const delta = zeros(4)
    .map((_, j) => {
      const k = Number(i > 0 || j > 0);
      return absolute[j] - k * offset[j];
    });

  return {
    value: delta,
    offset: absolute
  };
});

exports.absoluteToString = (absolute) => {
  const elements = absolute
    .reduce((list, segments, l2) => list.concat(
      segments.map(([c2, file, l1, c1]) => ({file, from: [l1 + 1, c1 + 1], to: [l2 + 1, c2 + 1]}))
    ), []);

  return (sources) => sources
    .map((filename, i) => {
      const linesHash = elements
        .filter(({file}) => file === i)
        .sort(({from: [la, ca]}, {from: [lb, cb]}) => (la - lb) || (ca - cb))
        .reduce((r, el) => {
          const [fromLine] = el.from;
          const list = (r[fromLine] || []).concat(el);
          return assign(r, {[fromLine]: list});
        }, {});

      return [filename].concat(
        values(linesHash)
          .map((segments) => segments
            .map(({from, to}) => unique([from.join(':'), to.join(':')]).join('->'))
            .join(' '))
          .map((v) => `  ${v}`)
      ).join('\n');
    })
    .join('\n\n');
};

exports.mappingsToAbsolute = compose(exports.deltaToAbsolute, exports.decodeMappings);

exports.absoluteToMappings = compose(exports.encodeMappings, exports.absoluteToDelta);

exports.mappingsToString = compose(exports.absoluteToString, exports.deltaToAbsolute, exports.decodeMappings);
