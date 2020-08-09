/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {statSync, existsSync} = require('fs');
const {basename, dirname} = require('path');
const {Readable, Writable} = require('stream');

const isObject = candidate =>
  !!candidate && (typeof candidate === 'object');

const isReadable = candidate =>
  !!candidate && (typeof candidate === 'object') && (candidate instanceof Readable);

const isWritable = candidate =>
  !!candidate && (typeof candidate === 'object') && (candidate instanceof Writable);

class Vinyl {
  constructor(path, stream) {
    let stat = null;

    const getStat = () => {
      if (!stat) {
        stat = path && existsSync(path) && statSync(path) || {
          isFile: () => false,
          isDirectory: () => false,
        };
      }
      return stat;
    };

    Object.defineProperties(this, {
      path: {
        enumerable: false,
        get: () => path,
        set: (v) => {
          path = v;
        }
      },
      stream: {
        enumerable: false,
        get: () => stream,
        set: (value) => {
          if (isReadable(value) || isWritable(value)) {
            stream = value;
          } else {
            throw new Error('value must be a stream.Readable or stream.Writable');
          }
        }
      },
      isReadable: {
        enumerable: false,
        get: () => isReadable(stream)
      },
      isWritable: {
        enumerable: false,
        get: () => isWritable(stream)
      },
      isDirectory: {
        enumerable: false,
        get: () => getStat().isDirectory()
      },
      isFile: {
        enumerable: false,
        get: () => getStat().isFile()
      },
      basename: {
        enumerable: false,
        get: () => getStat().isFile() && basename(path),
      },
      dirname: {
        enumerable: false,
        get: () => getStat().isFile() && dirname(path),
      },
      toString: {
        enumerable: false,
        value: () => `Vinyl(${path})`
      }
    });
  }
}
exports.Vinyl = Vinyl;

exports.isVinyl = candidate =>
  isObject(candidate) && (candidate instanceof Vinyl);
