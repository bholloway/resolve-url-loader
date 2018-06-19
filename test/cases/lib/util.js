'use strict';

exports.trim = (strings) =>
  strings.join('').split(/\s+/).join('');

exports.countQueries = (assets) =>
  assets.filter((v) => /[?#]/.test(v)).length;

exports.excludingHash = (assets) =>
  assets.map(v => v.split('#').shift());

exports.excludingQuery = (assets) =>
  assets.map(v => v.split('?').shift());

exports.excludingQuotes = (assets) =>
  assets.map(v => v.replace(/(^"|"$)/g, ''));

exports.isConsistent = (assets) =>
  assets.every((v, i, a) => (v === a[0]));

exports.unique = (assets) =>
  assets.filter((v, i, a) => (a.indexOf(v) === i));

exports.findMultilineMessages = (regexStart, regexEnd = regexStart) => (text) => {
  const lines = text.split('\n');
  const [ranges] = lines
    .reduce(([list, startIndex], v, i) => {
      const isStart = regexStart.test(v);
      const isComplete = (startIndex >= 0) && regexEnd.test(v);
      const pending = [
        isComplete && lines.slice(startIndex, i + 1).join('\n'),  // range stops this line
        isStart && isComplete && lines.slice(i, i + 1).join('\n') // range starts and stops this line
      ].filter(Boolean);
      return [
        pending.length ? list.concat(pending) : list,
        isStart ? i : pending.length ? -1 : startIndex
      ];
    }, [[], -1]);

  return ranges;
};
