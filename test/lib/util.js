'use strict';

exports.trim = (strings) =>
  strings.join('').split(/\s+/).join('');

exports.countQueries = (list) =>
  list.filter((v) => /[?#]/.test(v)).length;

exports.excludingHash = (list) =>
  list.map(v => v.split('#').shift());

exports.excludingQuery = (list) =>
  list.map(v => v.split('?').shift());

exports.excludingQuotes = (list) =>
  list.map(v => v.replace(/(^"|"$)/g, ''));

exports.isConsistent = (list) =>
  list.every((v, i, a) => (v === a[0]));

exports.unique = (list) =>
  list.filter((v, i, a) => (a.indexOf(v) === i));
