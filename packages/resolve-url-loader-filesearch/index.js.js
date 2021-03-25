/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const path = require('path');
const { createJoinFunction, createJoinImplementation, defaultJoinGenerator } = require('resolve-url-loader');

const generator = function* (item, options, loader) {
  if (item.isAbsolute) {
    for (let tuple of defaultJoinGenerator(item, options, loader)) {
      yield tuple;
    }
  } else {
    const includeRoot = !!options.includeRoot;
    const attempts = Math.max(0, options.attempts) || 1E+9;
    const breakOnFile = [].concat(options.breakOnFile) || ['package.json', 'bower.json'];
    const resolvedRoot = options.root || process.cwd();

    const isFile = (absolutePath) => {
      try {
        return loader.fs.statSync(absolutePath).isFile();
      } catch (error) {
        return false;
      }
    };

    const isDirectory = (absolutePath) => {
      try {
        return loader.fs.statSync(absolutePath).isDirectory();
      } catch (error) {
        return false;
      }
    };

    const predicate = typeof options.predicate === 'function' ?
      options.predicate :
      ((fs, absolutePath) => breakOnFile
        .map((file) => path.resolve(absolutePath, file))
        .every((absolutePath) => !isFile(absolutePath)));

    const testWithinLimit = (absolutePath) => {
      const relative = path.relative(resolvedRoot, absolutePath);
      return !!relative && (relative.slice(0, 2) !== '..');
    };

    const enqueue = (queue, excludes, basePath) =>
      loader.fs.readdirSync(basePath)
        .filter((filename) => filename.charAt(0) !== '.')
        .map((filename) => path.join(basePath, filename))
        .filter(isDirectory)
        .filter((absolutePath) => !excludes.contains(absolutePath))
        .filter((absolutePath) => predicate(loader.fs, absolutePath))
        .forEach((absolutePath) => queue.push(absolutePath));

    for (let [absoluteStart, uri] of defaultJoinGenerator(item, options, loader)) {
      // #69 limit searching: make at least one attempt
      let remaining = attempts;

      // find path to the root, stopping at cwd or at explicit boundary
      const pathToRoot = [];
      let isWorking;
      do {
        pathToRoot.push(absoluteStart);
        isWorking = testWithinLimit(absoluteStart) && predicate(absoluteStart);
        absoluteStart = path.resolve(absoluteStart, '..');
      } while (isWorking);

      // #62 support stylus nib: optionally force that path to include the root
      const appendRoot = includeRoot && (pathToRoot.indexOf(resolvedRoot) < 0);
      const queue = pathToRoot.concat(appendRoot ? resolvedRoot : []);

      // the queue pattern ensures that we favour paths closest the the start path
      // process the queue until empty or until we exhaust our attempts
      while (queue.length && (remaining-- > 0)) {
        const base = queue.shift();
        yield [base, uri];
        enqueue(queue, pathToRoot, base);
      }
    }
  }
};

module.exports = createJoinFunction(
  'resolve-url-loader-filesearch',
  createJoinImplementation(generator)
);
