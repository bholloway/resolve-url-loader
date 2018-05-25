'use strict';

const {existsSync, stat, readFile, writeFile, symlink, unlink} = require('fs');
const {isAbsolute} = require('path');
const {promisify} = require('es6-promisify');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const recursiveReaddir = require('recursive-readdir');

const sequence = require('promise-compose');
const {conditional, constant} = require('./promise');

const noop = () => {};

const getStat = sequence(
  conditional((v) => (typeof v === 'string') && isAbsolute(v) && existsSync(v)),
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

const withCatch = (log, text) => (fn) => {
  log(text);
  return fn().catch((error) => {
    console.error(`Can't ${text}`);
    console.error(error.stack.split('\n')[1] || '-no stack trace-');
    throw error;
  });
};

exports.MkDirOp = class MkDirOp {
  constructor({path, log = noop}) {
    this.path = path;
    this.log = log;
  }

  exec() {
    return withCatch(this.log, `mkdir: ${this.path}`)(
      () => promisify(mkdirp)(this.path)
        .then((created) => {this.created = created;})
        .then(constant(this))
    );
  }

  undo() {
    return withCatch(this.log, `rmdir: ${this.created || '-nothing-'}`)(
      () => conditional(exports.testIsEmpty)(this.created)
        .then((created) => created && promisify(rimraf)(created, {glob: false}))
        .then(constant(this))
    );
  }
};

exports.CleanOp = class CleanOp {
  constructor({path, log = noop}) {
    this.path = path;
    this.log = log;
  }

  exec() {
    return withCatch(this.log, `clean: ${this.path}`)(
      () => conditional(exports.testIsDir)(this.path)
        .then((dir) => dir && promisify(rimraf)([dir, '**', '*'].join('/')))
        .then(constant(this))
    );
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
    return withCatch(this.log, `symlink: ${this.destPath} => ${this.srcPath}`)(
      () => promisify(symlink)(this.srcPath, this.destPath, 'junction')
        .then(constant(this))
    );
  }

  undo() {
    return withCatch(this.log, `unlink: ${this.destPath}`)(
      () => promisify(unlink)(this.destPath)
        .then(constant(this))
    );
  }
};

exports.CopyOp = class CopyOp {
  constructor({srcPath, destPath, log = noop}) {
    this.srcPath = srcPath;
    this.destPath = destPath;
    this.log = log;
  }

  exec() {
    return withCatch(this.log, `copy: ${this.srcPath} => ${this.destPath}`)(
      () => promisify(readFile)(this.srcPath)
        .then((content) => promisify(writeFile)(this.destPath, content))
        .then(constant(this))
    );
  }

  undo() {
    return withCatch(this.log, `rm: ${this.destPath}`)(
      () => promisify(unlink)(this.destPath)
        .then(constant(this))
    );
  }
};

exports.WriteOp = class WriteOp {
  constructor({content, destPath, log = noop}) {
    this.content = content;
    this.destPath = destPath;
    this.log = log;
  }

  exec() {
    return withCatch(this.log, `write: [text] => ${this.destPath}`)(
      () => promisify(writeFile)(this.destPath, this.content)
        .then(constant(this))
    );
  }

  undo() {
    return withCatch(this.log, `rm: ${this.destPath}`)(
      () => promisify(unlink)(this.destPath)
        .then(constant(this))
    );
  }
};
