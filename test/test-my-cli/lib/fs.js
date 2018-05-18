'use strict';

const {exists, stat, readFile, writeFile, symlink, unlink} = require('fs');
const {isAbsolute} = require('path');
const mkdirp = require('mkdirp');
const {promisify} = require('util');
const rimraf = require('rimraf');
const recursiveReaddir = require('recursive-readdir');

const sequence = require('promise-compose');
const {conditional, constant} = require('./promise');

const noop = () => {};

const getStat = sequence(
  conditional((v) => (typeof v === 'string') && isAbsolute(v) && promisify(exists)(v)),
  (v) => v && promisify(stat)(v)
);

exports.testIsFile = sequence(
  getStat,
  (stats) => stats && stats.isFile()
);

exports.testIsDir = sequence(
  getStat,
  (stats) => stats && stats.isDirectory()
);

exports.testIsEmpty = sequence(
  conditional(exports.testIsDir),
  (directory) => directory && recursiveReaddir(directory),
  (files) => files && (files.length === 0)
);

const logAndHandle = (log, text) => {
  log(text);
  return (error) => {
    console.error(`Can't ${text}`);
    console.error(error.stack.split('\n')[1] || '-no stack trace-');
    throw error;
  };
};

exports.MkDirOp = class MkDirOp {
  constructor({path, log = noop}) {
    this.path = path;
    this.log = log;
  }

  exec() {
    return promisify(mkdirp)(this.path)
      .then((created) => {this.created = created;})
      .then(constant(this))
      .catch(logAndHandle(this.log, `mkdir: ${this.path}`));
  }

  undo() {
    return conditional(exports.testIsEmpty)(this.created)
      .then((created) => created && promisify(rimraf)(created, {glob: false}))
      .then(constant(this))
      .catch(logAndHandle(this.log, `rmdir: ${this.created || '-nothing-'}`));
  }
};

exports.CleanOp = class CleanOp {
  constructor({path, log = noop}) {
    this.path = path;
    this.log = log;
  }

  exec() {
    return conditional(exports.testIsDir)(this.path)
      .then((dir) => dir && promisify(rimraf)([dir, '**', '*'].join('/')))
      .then(constant(this))
      .catch(logAndHandle(this.log, `clean: ${this.path}`));
  }

  undo() {
    return this;
  }
};

exports.SymLinkOp = class SymLinkOp {
  constructor({srcPath, destPath, log = noop}) {
    this.srcPath = srcPath;
    this.destPath = destPath;
    this.log = log;
  }

  exec() {
    return promisify(symlink)(this.srcPath, this.destPath, 'junction')
      .then(constant(this))
      .catch(logAndHandle(this.log, `symlink: ${this.destPath} => ${this.srcPath}`));
  }

  undo() {
    return promisify(unlink)(this.destPath)
      .then(constant(this))
      .catch(logAndHandle(this.log, `unlink: ${this.destPath}`));
  }
};

exports.CopyOp = class CopyOp {
  constructor({srcPath, destPath, log = noop}) {
    this.srcPath = srcPath;
    this.destPath = destPath;
    this.log = log;
  }

  exec() {
    return promisify(readFile)(this.srcPath)
      .then((content) => promisify(writeFile)(this.destPath, content))
      .then(constant(this))
      .catch(logAndHandle(this.log, `copy: ${this.srcPath} => ${this.destPath}`));
  }

  undo() {
    return promisify(unlink)(this.destPath)
      .then(constant(this))
      .catch(logAndHandle(this.log, `rm: ${this.destPath}`));
  }
};

exports.WriteOp = class WriteOp {
  constructor({content, destPath, log = noop}) {
    this.content = content;
    this.destPath = destPath;
    this.log = log;
  }

  exec() {
    return promisify(writeFile)(this.destPath, this.content)
      .then(constant(this))
      .catch(logAndHandle(this.log, `write: [text] => ${this.destPath}`));
  }

  undo() {
    return promisify(unlink)(this.destPath)
      .then(constant(this))
      .catch(logAndHandle(this.log, `rm: ${this.destPath}`));
  }
};
