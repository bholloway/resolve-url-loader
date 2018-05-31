'use strict';

const {join, dirname} = require('path');

const {resolve, lib: {fs: {CleanOp}}} = require('test-my-cli');

exports.cleanOutputDir = resolve(
  ({cwd, env: {OUTPUT}}) => new CleanOp({path: join(cwd, dirname(OUTPUT))}).exec()
);

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
  