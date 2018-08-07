'use strict';

const {join, normalize, dirname, basename} = require('path');
const {readFile} = require('fs');
const {promisify} = require('es6-promisify');
const listDir = require('recursive-readdir');
const compose = require('compose-function');
const Joi = require('joi');
const outdent = require('outdent');
const escapeString = require('escape-string-regexp');
const {assign} = Object;

exports.withRebase = (listOrString) => ({root}) => {
  const transform = compose(v => v.replace(/\\/g, '/'), normalize, join);
  return Array.isArray(listOrString) ? listOrString.map((v) => transform(root, v)) : transform(root, listOrString);
};

/**
 * A factory for a higher-order-function that wraps a function of RegExp with template literal.
 *
 * @param {Array.<string>} strings Template literal strings
 * @param {...*} substitutions Any number of template literal substitutions
 * @return {function(function)} A higher-order-function of the assert function
 */
exports.withPattern = (next) => (strings, ...substitutions) => {
  const raw  = [].concat(strings.raw || strings);
  const text = assign(raw.slice(), {raw});
  const source = outdent(text, ...substitutions.map(v => escapeString(v)));
  return next(new RegExp(source, 'gm'));
};

/**
 * A factory for a higher-order-function that enhances an assert() function with a list of files
 * of the given extension.
 *
 * @param {string} [ext] Optional extention of the file to locate
 * @param {string} [subdir] A subdirectory of the root
 * @return {function(function)} A higher-order-function of the assert function
 */
exports.withFiles = ({ext, subdir}) => (next) => {
  Joi.assert(ext, Joi.string().optional(), 'optional extension to filter files');
  Joi.assert(subdir, Joi.alternatives().try(
    Joi.string().required(),
    Joi.func().required()
  ).optional(), 'optional subdirectory or subdirectory function');
  Joi.assert(next, Joi.func().arity(3).required(), 'assert function of test,exec,files');

  return (test, exec) => {
    Joi.assert(test, Joi.object().required(), 'Tape test object');
    Joi.assert(exec, Joi.object().required(), 'Result of an exec() call');

    const {root} = exec;
    const directory = subdir ?
      compose(normalize, join)(root, (typeof subdir === 'function') ? subdir(exec) : subdir) :
      root;

    return listDir(directory)
      .then((list) => ext ? list.filter((v) => v.endsWith(`.${ext}`)) : list)
      .then((list) => next(test, exec, list));
  };
};

/**
 * A higher-order-function that enhances an assert() function with the content of the files given.
 *
 * @type {function(function)} A higher-order-function of the assert function
 */
exports.withFileContent = (next) => {
  Joi.assert(next, Joi.func().arity(3).required(), 'assert function of test,exec,files');

  return (test, exec, list) => {
    Joi.assert(test, Joi.object().required(), 'Tape test object');
    Joi.assert(exec, Joi.object().required(), 'Result of an exec() call');
    Joi.assert(list, Joi.array().items(Joi.string()).required(), 'List of files');

    return Promise.all(
      list.map((path) => promisify(readFile)(path, 'utf8')
        .then((content) => ({
          path,
          base: dirname(path),
          name: basename(path),
          content
        }))
      )
    )
      .then(list => next(test, exec, list));
  };
};

/**
 * A higher-order-function that enhances an assert() function by parsing JSON of the strings given.
 *
 * @type {function(function)} A higher-order-function of the assert function
 */
exports.withJson = (next) => {
  Joi.assert(next, Joi.func().arity(3).required(), 'assert function of test,exec,files');

  return (test, exec, list) => {
    Joi.assert(test, Joi.object().required(), 'Tape test object');
    Joi.assert(exec, Joi.object().required(), 'Result of an exec() call');
    Joi.assert(list, Joi.array().items(
      Joi.object({content: Joi.string().required()}).unknown(true)
    ).required(), 'Any number of elements with "content" property');

    return Promise.resolve(next(
      test,
      exec,
      list.map(({content}) => JSON.parse(content))
    ));
  };
};

/**
 * A higher-order-function that enhances an assert() function by splitting out withSourceMappingURL
 * comment from the file content.
 *
 * Operates on a list of vinyl-like files `{path, base, name, content}` where at least `content`
 * should be present. A `withSourceMappingURL` field is added where comment is present.
 *
 * Both the `content` and the `withSourceMappingURL` are trimmed.
 *
 * @param {function} next An assert function
 * @return {function} A new assert function
 */
exports.withSourceMappingURL = (next) => {
  Joi.assert(next, Joi.func().arity(3).required(), 'assert function of test,exec,files');

  return (test, exec, list) => {
    Joi.assert(test, Joi.object().required(), 'Tape test object');
    Joi.assert(exec, Joi.object().required(), 'Result of an exec() call');
    Joi.assert(list, Joi.array().items(
      Joi.object({content: Joi.string().required()}).unknown(true)
    ).required(), 'Any number of elements with "content" property');

    return Promise.resolve(next(
      test,
      exec,
      list.map((file) => {
        const {content: raw} = file;
        const [content, sourceMappingURL] = raw
          .split(/^\/\*#\s*sourceMappingURL=([^*]+)\*\/$/m)
          .map((v) => v.trim());

        return assign({}, file, {content, sourceMappingURL});
      })
    ));
  };
};

/**
 * A higher-order-function that enhances an assert() function by splitting out url() asserts from
 * css contents.
 *
 * Operates on a list of vinyl-like files `{path, base, name, content}` where at least `content`
 * should be present. An `asserts` field is added to each element in the list. This Array may be
 * empty where no url() statements are present.
 *
 * Both the `content` and the `sourceMappingUrl` are trimmed.
 *
 * @param {function} next An assert function
 * @return {function} A new assert function
 */
exports.withSplitCssAssets = (next) => {
  Joi.assert(next, Joi.func().arity(3).required(), 'assert function of test,exec,files');

  return (test, exec, list) => {
    Joi.assert(test, Joi.object().required(), 'Tape test object');
    Joi.assert(exec, Joi.object().required(), 'Result of an exec() call');
    Joi.assert(list, Joi.array().items(
      Joi.object({content: Joi.string().required()}).unknown(true)
    ).required(), 'Any number of elements with "content" property');

    return Promise.resolve(next(
      test,
      exec,
      list.map((file) => {
        const {content: raw} = file;
        const [content, assets] = raw.split(/url\(([^)]+)\)/).reduce(
          ([c, a], v, i) => (i % 2 === 0) ? [`${c}${v}`, a] : [`${c}url($${a.length})`, [...a, v]],
          ['', []]
        );

        return assign({}, file, {content, assets});
      })
    ));
  };
};
