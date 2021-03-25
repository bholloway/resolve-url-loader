/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {resolve} = require('path');
const tape = require('blue-tape');
const sinon = require('sinon');
const outdent = require('outdent');

const { createDebugLogger, formatJoinMessage } = require('./debug');

const json = (strings, ...substitutions) =>
  String.raw(
    strings,
    ...substitutions.map(v => JSON.stringify(v, (_, vv) => Number.isNaN(vv) ? 'NaN' : vv))
  );

tape(
  'debug',
  ({name, test, end: end1, equal, looseEqual}) => {
    test(`${name} / formatJoinMessage()`, ({end: end2}) => {
      [
        // absolute within cwd
        [
          [
            resolve('my-source-file.js'),
            'my-asset.png',
            [
              {
                base: resolve('foo'),
                joined: resolve('foo', 'my-asset.png'),
                isSuccess: false
              }, {
                base: resolve('bar', 'baz'),
                joined: resolve('bar', 'baz', 'my-asset.png'),
                isSuccess: true
              }
            ]
          ],
          outdent`
            resolve-url-loader: ./my-source-file.js: my-asset.png
              ./foo     --> ./foo/my-asset.png
              ./bar/baz --> ./bar/baz/my-asset.png
              FOUND
            `
        ],
        // absolute otherwise
        [
          [
            '/my-source-file.js',
            '#anything\\./goes',
            [
              {
                base: '/foo',
                joined: '/foo/#anything\\./goes',
                isSuccess: false
              }, {
                base: '/bar/baz',
                joined: '/bar/baz/#anything\\./goes',
                isSuccess: false
              }
            ]
          ],
          outdent`
            resolve-url-loader: /my-source-file.js: #anything\\./goes
              /foo     --> /foo/#anything\\./goes
              /bar/baz --> /bar/baz/#anything\\./goes
              NOT FOUND
            `
        ],
        // presumed relative
        [
          [
            'my-source-file.js',
            'my-asset.png',
            [
              {
                base: 'foo',
                joined: 'foo/my-asset.png',
                isSuccess: true,
              }, {
                base: 'bar/baz',
                joined: 'bar/baz/my-asset.png',
                isSuccess: false
              }
            ]
          ],
          outdent`
            resolve-url-loader: ./my-source-file.js: my-asset.png
              ./foo     --> ./foo/my-asset.png
              ./bar/baz --> ./bar/baz/my-asset.png
              FOUND
            `
        ],
        // explicitly relative
        [
          [
            './my-source-file.js',
            'my-asset.png',
            [
              {
                base: './foo',
                joined: './foo/my-asset.png',
                isSuccess: false,
              }, {
                base: './bar/baz',
                joined: './bar/baz/my-asset.png',
                isSuccess: true,
              }
            ]
          ],
          outdent`
            resolve-url-loader: ./my-source-file.js: my-asset.png
              ./foo     --> ./foo/my-asset.png
              ./bar/baz --> ./bar/baz/my-asset.png
              FOUND
            `
        ],
        [
          [
            '../my-source-file.js',
            'my-asset.png',
            [
              {
                base: '../foo',
                joined: '../foo/my-asset.png',
                isSuccess: false
              }, {
                base: '../bar/baz',
                joined: '../bar/baz/my-asset.png',
                isSuccess: false
              }
            ]
          ],
          outdent`
            resolve-url-loader: ../my-source-file.js: my-asset.png
              ../foo     --> ../foo/my-asset.png
              ../bar/baz --> ../bar/baz/my-asset.png
              NOT FOUND
            `
        ],
        // empty
        [
          ['./my-source-file.js', 'my-asset.png', []],
          outdent`
            resolve-url-loader: ./my-source-file.js: my-asset.png
              -empty-
              NOT FOUND
            `
        ],
      ].forEach(([input, expected]) =>
        equal(
          formatJoinMessage(...input),
          expected,
          json`input ${input} should sanitise to ${expected}`
        )
      );

      end2();
    });

    test(`${name} / createDebugLogger()`, ({name: name2, test: test2, end: end2}) => {
      test2(`${name2} / false`, ({end: end3}) => {
        const sandbox = sinon.createSandbox();
        const factory = sandbox.fake.returns('foo');
        const consoleLog = sandbox.stub(console, 'log');

        const logger = createDebugLogger(false);
        logger(factory);
        sandbox.restore();

        equal(consoleLog.callCount, 0, 'should not call console.log()');
        equal(factory.callCount, 0, 'should not call underlying message factory');

        end3();
      });

      test2(`${name2} / true`, ({end: end3}) => {
        const sandbox = sinon.createSandbox();
        const factory = sandbox.fake.returns('foo');
        const consoleLog = sandbox.stub(console, 'log');

        const logger = createDebugLogger(true);
        logger(factory, ['bar', 1, false]);
        logger(factory, ['baz', 2, undefined]);
        sandbox.restore();

        equal(factory.callCount, 2, 'should call underlying log message factory');
        looseEqual(
          factory.args,
          [['bar', 1, false], ['baz', 2, undefined]],
          'should call underlying message factory with expected arguments'
        );

        equal(consoleLog.callCount, 2, 'should call console.log()');
        looseEqual(
          consoleLog.args,
          [['foo'], ['foo']],
          'should log expected value'
        );

        end3();
      });

      test2(`${name2} / logFn`, ({end: end3}) => {
        const sandbox = sinon.createSandbox();
        const factory = sandbox.fake.returns('foo');
        const consoleLog = sandbox.stub(console, 'log');
        const logFn = sandbox.spy();

        const logger = createDebugLogger(logFn);
        logger(factory, ['bar', 1, false]);
        logger(factory, ['baz', 2, undefined]);
        sandbox.restore();

        equal(factory.callCount, 2, 'should call underlying log message factory');
        looseEqual(
          factory.args,
          [['bar', 1, false], ['baz', 2, undefined]],
          'should call underlying message factory with expected arguments'
        );

        equal(logFn.callCount, 2, 'should call logFn()');
        looseEqual(
          logFn.args,
          [['foo'], ['foo']],
          'should log expected value'
        );

        equal(consoleLog.callCount, 0, 'should not call console.log()');

        end3();
      });

      end2();
    });

    end1();
  }
);
