'use strict';

const {normalize, join, dirname} = require('path');
const compose = require('compose-function');

const {resolve, lib: {fs: {CleanOp}}} = require('test-my-cli');

exports.cleanOutputDir = resolve(
  ({cwd, env: {OUTPUT}}) => {
    const path = compose(dirname, normalize, join)(cwd, OUTPUT);
    return new CleanOp({path}).exec();
  }
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
  