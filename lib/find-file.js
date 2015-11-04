'use strict';

var fs   = require('fs'),
    path = require('path');

module.exports = {
  absolute: absolute,
  base    : base
};

/**
 * Search for the relative file reference from the <code>startPath</code> up to the process
 * working directory, avoiding any other directories with a <code>package.json</code> or <code>bower.json</code>.
 * @param {string} startPath The location of the uri declaration and the place to start the search from
 * @param {string} uri The content of the url() statement, expected to be a relative file path
 * @param {string} [limit] Optional directory to limit the search to
 * @returns {string|null} <code>null</code> where not found else the absolute path to the file
 */
function absolute(startPath, uri, limit) {
  var basePath = base(startPath, uri, limit);
  return !!basePath && path.resolve(basePath, uri);
}

/**
 * Search for the relative file reference from the <code>startPath</code> up to the process
 * working directory, avoiding any other directories with a <code>package.json</code> or <code>bower.json</code>.
 * @param {string} startPath The location of the uri declaration and the place to start the search from
 * @param {string} uri The content of the url() statement, expected to be a relative file path
 * @param {string} [limit] Optional directory to limit the search to
 * @returns {string|null} <code>null</code> where not found else the base path upon which the uri may be resolved
 */
function base(startPath, uri, limit) {

  // ensure we have some limit to the search
  limit = limit && path.resolve(limit) || process.cwd();

  // ignore data uris and ensure we are at a valid start path
  var absoluteStart = !(/^data\:/.test(uri)) && path.resolve(startPath);
  if (absoluteStart) {

    // find path to the root, stopping at cwd, package.json or bower.json
    var pathToRoot = [];
    var isWorking;
    do {
      pathToRoot.push(absoluteStart);
      isWorking = testWithinLimit(absoluteStart) && testNotPackage(absoluteStart);
      absoluteStart = path.resolve(absoluteStart, '..');
    } while (isWorking);

    // start a queue with the path to the root
    var queue = pathToRoot.concat();

    // process the queue until empty
    //  the queue pattern ensures that we favour paths closest the the start path
    while (queue.length) {

      // shift the first item off the queue, consider it the base for our relative uri
      var basePath = queue.shift();
      var fullPath = path.resolve(basePath, uri);

      // file exists so convert to a dataURI and end
      if (fs.existsSync(fullPath)) {
        return basePath;
      }
      // enqueue subdirectories that are not packages and are not in the root path
      else {
        enqueue(queue, basePath);
      }
    }
  }

  // ignored or not found
  return null;

  /**
   * Enqueue subdirectories that are not packages and are not in the root path
   * @param {Array} queue The queue to add to
   * @param {string} basePath The path to consider
   */
  function enqueue(queue, basePath) {
    fs.readdirSync(basePath)
      .filter(function notHidden(filename) {
        return (filename.charAt(0) !== '.');
      })
      .map(function toAbsolute(filename) {
        return path.join(basePath, filename);
      })
      .filter(function directoriesOnly(absolutePath) {
        return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory();
      })
      .filter(function notInRootPath(absolutePath) {
        return (pathToRoot.indexOf(absolutePath) < 0);
      })
      .filter(testNotPackage)
      .forEach(function enqueue(absolutePath) {
        queue.push(absolutePath);
      });
  }

  /**
   * Test whether the given directory is above but not equal to any of the project root directories.
   * @param {string} absolutePath An absolute path
   * @returns {boolean} True where a package.json or bower.json exists, else False
   */
  function testWithinLimit(absolutePath) {
    var relative = path.relative(limit, absolutePath);
    return !!relative && (relative.slice(0, 2) !== '..');
  }
}

/**
 * Test whether the given directory is the root of its own package.
 * @param {string} absolutePath An absolute path
 * @returns {boolean} True where a package.json or bower.json exists, else False
 */
function testNotPackage(absolutePath) {
  return ['package.json', 'bower.json'].every(function fileFound(file) {
    return !fs.existsSync(path.resolve(absolutePath, file));
  });
}