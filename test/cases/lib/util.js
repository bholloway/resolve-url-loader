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
