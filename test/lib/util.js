'use strict';

const collapseLines = v =>
  v.split(/\s+\n|\n\s+/).join('');

const escapeXml = v =>
  v.replace(/"/g, '\'').replace(/</g, '%3C').replace(/>/g, '%3E');

const createTemplateLiteral = (...fns) => ({raw}, ...substitutions) =>
  String.raw({raw: fns.reduce((r, fn) => r.map(fn), raw)}, ...substitutions);

exports.trim = createTemplateLiteral(collapseLines);

exports.encodeXml = createTemplateLiteral(collapseLines, escapeXml);

exports.escapeStr = (text) =>
  JSON.stringify(text).slice(1, -1);

exports.countQueries = (list) =>
  list.filter((v) => /[?#]/.test(v)).length;

exports.excludingHash = (list) =>
  list.map(v => v.split('#').shift());

exports.excludingQuery = (list) =>
  list.map(v => v.split('?').shift());

exports.excludingQuotes = (list) =>
  list.map(v => v.replace(/(^"|"$)/g, ''));

exports.unique = (list) =>
  list.filter((v, i, a) => (a.indexOf(v) === i));
