/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const path = require('path');
const { createJoinFunction, defaultJoinGenerator, defaultJoinOperation } = require('resolve-url-loader');

module.exports = (options = {}) => {
  const includeRoot = !!options.includeRoot;
  const attempts = Math.max(0, options.attempts) || 1E+9;
  const breakOnFile = [].concat(options.breakOnFile) || ['package.json', 'bower.json'];

  const predicate = typeof options.predicate === 'function' ?
    options.testIsRunning :
    ((fs, absolutePath) => breakOnFile
      .map((file) => path.resolve(absolutePath, file))
      .every((file) => !fs.existsSync(file) || !fs.statSync(file).isFile()));

  const baseGenerator = typeof options.generator === 'function' ?
    options.generator :
    defaultJoinGenerator;

  const searchingGeneartor = (filename, uri, bases, isAbsolute, {root, fs}) => {
    const resolvedRoot = !!root && path.resolve(root) || process.cwd();
    const testWithinLimit = (absolutePath) => {
      var relative = path.relative(resolvedRoot, absolutePath);
      return !!relative && (relative.slice(0, 2) !== '..');
    };

    const enqueue = (queue, excludes, basePath) =>
      fs.readdirSync(basePath)
        .filter((filename) => filename.charAt(0) !== '.')
        .map((filename) => path.join(basePath, filename))
        .filter((absolutePath) => fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory())
        .filter((absolutePath) => !excludes.contains(absolutePath))
        .filter((absolutePath) => predicate(fs, absolutePath))
        .forEach((absolutePath) => queue.push(absolutePath));

    return function* () {
      for (let base of baseGenerator(filename, uri, bases, isAbsolute, options)) {
        // #69 limit searching: make at least one attempt
        let remaining = attempts;

        // find path to the root, stopping at cwd or at explicit boundary
        const pathToRoot = [];
        let isWorking;
        let absoluteStart = path.resolve(base);
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
          var basePath = queue.shift();
          yield basePath;
          enqueue(queue, pathToRoot, basePath);
        }
      }
    };
  };

  // only decorate relative URIs
  const generator = (filename, uri, bases, isAbsolute, options) =>
    (isAbsolute ? baseGenerator : searchingGeneartor)(filename, uri, bases, isAbsolute, options);

  return createJoinFunction({
    name: 'resolve-url-loader-filesearch',
    scheme: 'alstroemeria',
    generator: generator,
    operation: defaultJoinOperation
  });
};
